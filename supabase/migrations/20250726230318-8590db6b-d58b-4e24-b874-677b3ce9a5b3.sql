-- Corrigir função get_room_availability para bloquear horários paid/in_process
CREATE OR REPLACE FUNCTION public.get_room_availability(p_room_id uuid, p_date date)
 RETURNS TABLE(hour text, is_available boolean, blocked_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    room_schedule RECORD;
    current_hour INTEGER;
    hour_time TIME;
    day_of_week INTEGER;
    weekday_name TEXT;
    start_hour INTEGER;
    end_hour INTEGER;
    booking_exists BOOLEAN;
BEGIN
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

    -- Buscar horário de funcionamento da sala para o dia específico
    SELECT rs.start_time, rs.end_time INTO room_schedule
    FROM room_schedules rs
    WHERE rs.room_id = p_room_id 
        AND rs.weekday = weekday_name::weekday;

    -- Se não encontrar horário para este dia, sala está fechada
    IF NOT FOUND THEN
        RAISE LOG 'Nenhum horário encontrado para sala % no dia %', p_room_id, weekday_name;
        RETURN;
    END IF;

    -- Extrair horas de início e fim
    start_hour := EXTRACT(HOUR FROM room_schedule.start_time);
    end_hour := EXTRACT(HOUR FROM room_schedule.end_time);
    
    RAISE LOG 'Sala % funciona das %:00 às %:00 em %', p_room_id, start_hour, end_hour, weekday_name;

    -- Gerar disponibilidade para cada hora
    current_hour := start_hour;
    WHILE current_hour < end_hour LOOP
        hour_time := (current_hour || ':00')::TIME;
        booking_exists := FALSE;
        
        -- Verificar se há reserva confirmada neste horário (paid e in_process)
        SELECT EXISTS(
            SELECT 1 FROM bookings b
            WHERE b.room_id = p_room_id
                AND DATE(b.start_time) = p_date
                AND b.status IN ('paid', 'in_process')
                AND (
                    (b.start_time::TIME <= hour_time AND b.end_time::TIME > hour_time)
                    OR (b.start_time::TIME < (hour_time + '1 hour'::INTERVAL)::TIME AND b.end_time::TIME >= (hour_time + '1 hour'::INTERVAL)::TIME)
                    OR (b.start_time::TIME >= hour_time AND b.end_time::TIME <= (hour_time + '1 hour'::INTERVAL)::TIME)
                )
        ) INTO booking_exists;
        
        IF booking_exists THEN
            RETURN QUERY SELECT 
                (current_hour || ':00'), 
                FALSE, 
                'Reservado';
            current_hour := current_hour + 1;
            CONTINUE;
        END IF;
        
        -- Horário está disponível
        RETURN QUERY SELECT 
            (current_hour || ':00'), 
            TRUE, 
            NULL::TEXT;
        
        current_hour := current_hour + 1;
    END LOOP;
    
    RAISE LOG 'Função get_room_availability concluída para sala % em %', p_room_id, p_date;
END;
$function$;

-- Corrigir função get_equipment_availability para bloquear horários paid/in_process
CREATE OR REPLACE FUNCTION public.get_equipment_availability(p_equipment_id uuid, p_date date, p_requested_quantity integer DEFAULT 1)
 RETURNS TABLE(hour text, is_available boolean, available_quantity integer, blocked_reason text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  equipment_schedule RECORD;
  equipment_info RECORD;
  current_hour INTEGER;
  hour_time TIME;
  day_of_week INTEGER;
  weekday_name TEXT;
  total_quantity INTEGER;
  reserved_quantity INTEGER;
  end_hour INTEGER;
BEGIN
  -- Obter informações do equipamento
  SELECT e.quantity INTO equipment_info
  FROM equipment e
  WHERE e.id = p_equipment_id AND e.is_active = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  total_quantity := equipment_info.quantity;

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
  SELECT es.start_time, es.end_time INTO equipment_schedule
  FROM equipment_schedules es
  WHERE es.equipment_id = p_equipment_id 
    AND es.weekday = weekday_name::weekday;

  -- Se não encontrar horário para este dia, equipamento está fechado
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Definir horário de início e fim
  current_hour := EXTRACT(HOUR FROM equipment_schedule.start_time);
  end_hour := EXTRACT(HOUR FROM equipment_schedule.end_time);
  
  -- Gerar horários disponíveis
  WHILE current_hour < end_hour LOOP
    hour_time := (current_hour || ':00')::TIME;
    reserved_quantity := 0;
    
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
END;
$function$;

-- Função para cancelar reservas PIX expiradas (20 minutos)
CREATE OR REPLACE FUNCTION public.cancel_expired_pix_reservations()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  -- Cancelar reservas de sala PIX expiradas (20 minutos)
  UPDATE bookings
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE status = 'in_process'
    AND order_id IN (
      SELECT o.id FROM orders o
      INNER JOIN payment_details pd ON pd.order_id = o.id
      WHERE o.status = 'pending'
        AND pd.payment_method = 'pix'
        AND o.created_at < now() - interval '20 minutes'
    );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Reservas de sala PIX canceladas por expiração: %', v_count;
  
  -- Cancelar reservas de equipamento PIX expiradas (20 minutos)
  UPDATE booking_equipment
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE status = 'in_process'
    AND order_id IN (
      SELECT o.id FROM orders o
      INNER JOIN payment_details pd ON pd.order_id = o.id
      WHERE o.status = 'pending'
        AND pd.payment_method = 'pix'
        AND o.created_at < now() - interval '20 minutes'
    );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Reservas de equipamento PIX canceladas por expiração: %', v_count;
  
  -- Cancelar pedidos PIX expirados
  UPDATE orders
  SET status = 'cancelled', updated_at = now()
  WHERE status = 'pending'
    AND id IN (
      SELECT o.id FROM orders o
      INNER JOIN payment_details pd ON pd.order_id = o.id
      WHERE pd.payment_method = 'pix'
        AND o.created_at < now() - interval '20 minutes'
    );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Pedidos PIX cancelados por expiração: %', v_count;
END;
$function$;