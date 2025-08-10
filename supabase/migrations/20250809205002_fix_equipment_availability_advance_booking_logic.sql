-- Fix equipment availability advance booking logic
-- Change <= to < in the time comparison to allow bookings at the exact advance booking limit

CREATE OR REPLACE FUNCTION public.get_equipment_availability(p_equipment_id uuid, p_date date, p_requested_quantity integer DEFAULT 1)
 RETURNS TABLE(hour text, is_available boolean, available_quantity integer, blocked_reason text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  equipment_schedule RECORD;
  equipment_info RECORD;
  current_hour INTEGER;
  hour_time TIME;
  hour_datetime TIMESTAMPTZ;
  current_datetime TIMESTAMPTZ;
  day_of_week INTEGER;
  weekday_name TEXT;
  total_quantity INTEGER;
  reserved_quantity INTEGER;
  end_hour INTEGER;
  equipment_advance_hours INTEGER;
  manual_block_exists BOOLEAN;
BEGIN
  -- Obter informações do equipamento
  SELECT e.quantity, e.advance_booking_hours INTO equipment_info
  FROM equipment e
  WHERE e.id = p_equipment_id AND e.is_active = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  total_quantity := equipment_info.quantity;
  equipment_advance_hours := COALESCE(equipment_info.advance_booking_hours, 1);
  current_datetime := now();

  -- Converter número do dia da semana para nome
  day_of_week := EXTRACT(DOW FROM p_date);
  weekday_name := CASE day_of_week
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday' 
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;

  -- Buscar horários de funcionamento do equipamento para o dia da semana específico
  FOR equipment_schedule IN
    SELECT es.start_time, es.end_time
    FROM equipment_schedules es
    WHERE es.equipment_id = p_equipment_id 
      AND es.weekday = weekday_name::weekday
    ORDER BY es.start_time
  LOOP
    -- Definir horário de início e fim
    current_hour := EXTRACT(HOUR FROM equipment_schedule.start_time);
    end_hour := EXTRACT(HOUR FROM equipment_schedule.end_time);
    
    -- Gerar horários disponíveis
    WHILE current_hour < end_hour LOOP
      hour_time := (current_hour || ':00')::TIME;
      hour_datetime := (p_date || ' ' || hour_time)::TIMESTAMPTZ;
      reserved_quantity := 0;
      manual_block_exists := FALSE;
      
      -- Verificar se o horário já passou (considerando antecedência mínima)
      -- CORREÇÃO: Mudança de <= para < para permitir horários no limite exato
      IF hour_datetime < (current_datetime + (equipment_advance_hours || ' hours')::INTERVAL) THEN
        RETURN QUERY SELECT 
          (current_hour || ':00'), 
          FALSE, 
          0,
          'Horário já passou ou muito próximo';
        current_hour := current_hour + 1;
        CONTINUE;
      END IF;
      
      -- Verificar bloqueios manuais
      SELECT EXISTS(
        SELECT 1 FROM equipment_manual_blocks emb
        WHERE emb.equipment_id = p_equipment_id
          AND hour_datetime >= emb.start_time
          AND hour_datetime < emb.end_time
      ) INTO manual_block_exists;
      
      IF manual_block_exists THEN
        RETURN QUERY SELECT 
          (current_hour || ':00'), 
          FALSE, 
          0,
          'Bloqueado manualmente';
        current_hour := current_hour + 1;
        CONTINUE;
      END IF;
      
      -- Verificar quantas unidades estão reservadas neste horário (paid e in_process)
      SELECT COALESCE(SUM(be.quantity), 0) INTO reserved_quantity
      FROM booking_equipment be
      WHERE be.equipment_id = p_equipment_id
        AND DATE(be.start_time) = p_date
        AND be.status IN ('paid', 'in_process')
        AND (
            (be.start_time::TIME <= hour_time AND be.end_time::TIME > hour_time)
            OR (be.start_time::TIME < (hour_time + '1 hour'::INTERVAL)::TIME AND be.end_time::TIME >= (hour_time + '1 hour'::INTERVAL)::TIME)
            OR (be.start_time::TIME >= hour_time AND be.end_time::TIME <= (hour_time + '1 hour'::INTERVAL)::TIME)
        );
      
      -- Calcular quantidade disponível
      DECLARE
        available_qty INTEGER := total_quantity - reserved_quantity;
      BEGIN
        IF available_qty >= p_requested_quantity THEN
          -- Horário disponível
          RETURN QUERY SELECT 
            (current_hour || ':00'), 
            TRUE, 
            available_qty,
            NULL::TEXT;
        ELSE
          -- Horário indisponível
          RETURN QUERY SELECT 
            (current_hour || ':00'), 
            FALSE, 
            available_qty,
            CASE 
              WHEN available_qty = 0 THEN 'Totalmente reservado'
              ELSE 'Quantidade insuficiente disponível'
            END;
        END IF;
      END;
      
      current_hour := current_hour + 1;
    END LOOP;
  END LOOP;
END;
$function$;