-- Corrigir problema do cursor na função get_room_availability
-- O cursor estava sendo definido antes da variável weekday_name ser inicializada
CREATE OR REPLACE FUNCTION public.get_room_availability(p_room_id uuid, p_date date)
 RETURNS TABLE(hour text, is_available boolean, blocked_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  schedule_record RECORD;
  booking_record RECORD;
  cart_record RECORD;
  current_hour INTEGER;
  hour_time TIME;
  day_of_week INTEGER;
  weekday_name TEXT;
  end_hour INTEGER;
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

  RAISE LOG 'Buscando disponibilidade para sala % em % (weekday: %)', p_room_id, p_date, weekday_name;

  -- Iterar por todos os horários de funcionamento da sala para o dia específico
  FOR schedule_record IN 
    SELECT rs.start_time, rs.end_time 
    FROM room_schedules rs
    WHERE rs.room_id = p_room_id 
      AND rs.weekday = weekday_name::weekday
    ORDER BY rs.start_time
  LOOP
    -- Extrair horas de início e fim do horário atual
    current_hour := EXTRACT(HOUR FROM schedule_record.start_time);
    end_hour := EXTRACT(HOUR FROM schedule_record.end_time);
    
    RAISE LOG 'Processando horário de funcionamento: %:00 às %:00', current_hour, end_hour;
    
    -- Gerar horários disponíveis (INCLUSIVE do horário de fechamento)
    WHILE current_hour <= end_hour LOOP
      hour_time := (current_hour || ':00')::TIME;
      
      -- Verificar se há reserva confirmada neste horário
      SELECT b.id INTO booking_record
      FROM bookings b
      WHERE b.room_id = p_room_id
        AND DATE(b.start_time) = p_date
        AND b.status IN ('paid', 'pre_authorized', 'in_process')
        AND hour_time >= b.start_time::TIME
        AND hour_time < b.end_time::TIME
      LIMIT 1;
      
      IF FOUND THEN
        RETURN QUERY SELECT 
          (current_hour || ':00'), 
          FALSE, 
          'Reservado';
        current_hour := current_hour + 1;
        CONTINUE;
      END IF;
      
      -- Verificar se há item no carrinho (reserva temporária) neste horário
      SELECT ci.id INTO cart_record
      FROM cart_items ci
      JOIN bookings b ON ci.reserved_booking_id = b.id
      WHERE b.room_id = p_room_id
        AND DATE(b.start_time) = p_date
        AND b.status = 'pending'
        AND ci.expires_at > NOW()
        AND hour_time >= b.start_time::TIME
        AND hour_time < b.end_time::TIME
      LIMIT 1;
      
      IF FOUND THEN
        RETURN QUERY SELECT 
          (current_hour || ':00'), 
          FALSE, 
          'Temporariamente reservado';
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
  END LOOP;
  
  RAISE LOG 'Função get_room_availability concluída para sala % em %', p_room_id, p_date;
END;
$function$;

-- Garantir que a função tenha as permissões corretas
GRANT EXECUTE ON FUNCTION public.get_room_availability(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_availability(uuid, date) TO anon;

-- Log para confirmar criação
DO $$
BEGIN
    RAISE NOTICE 'Função get_room_availability corrigida - cursor removido e logs adicionados!';
END $$;