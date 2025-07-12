-- Função para verificar disponibilidade considerando carrinho e schedules
CREATE OR REPLACE FUNCTION get_room_availability(
  p_room_id UUID,
  p_date DATE
) RETURNS TABLE (
  hour TEXT,
  is_available BOOLEAN,
  blocked_reason TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  room_schedule RECORD;
  booking_record RECORD;
  cart_record RECORD;
  current_hour INTEGER;
  current_time TIME;
  is_room_open BOOLEAN;
  day_of_week INTEGER;
  weekday_name TEXT;
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

  -- Buscar horários de funcionamento da sala para o dia da semana
  SELECT rs.start_time, rs.end_time INTO room_schedule
  FROM room_schedules rs
  WHERE rs.room_id = p_room_id 
    AND rs.weekday = weekday_name::weekday;

  -- Se não há schedule para este dia, a sala está fechada
  IF NOT FOUND THEN
    -- Verificar se a sala tem horários padrão (open_time/close_time)
    SELECT r.open_time, r.close_time INTO room_schedule
    FROM rooms r 
    WHERE r.id = p_room_id;
    
    -- Se não tem horários definidos, retorna vazio
    IF room_schedule.start_time IS NULL OR room_schedule.close_time IS NULL THEN
      RETURN;
    END IF;
  END IF;

  -- Gerar horários disponíveis
  current_hour := EXTRACT(HOUR FROM room_schedule.start_time);
  
  WHILE current_hour < EXTRACT(HOUR FROM room_schedule.end_time) LOOP
    current_time := (current_hour || ':00')::TIME;
    is_room_open := TRUE;
    
    -- Verificar se há booking confirmado neste horário
    SELECT b.id INTO booking_record
    FROM bookings b
    WHERE b.room_id = p_room_id
      AND b.start_time::DATE = p_date
      AND b.status NOT IN ('cancelled', 'cancelled_unpaid')
      AND current_time >= b.start_time::TIME
      AND current_time < b.end_time::TIME
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
      AND b.start_time::DATE = p_date
      AND b.status = 'pending'
      AND ci.expires_at > NOW()
      AND current_time >= b.start_time::TIME
      AND current_time < b.end_time::TIME
    LIMIT 1;
    
    IF FOUND THEN
      RETURN QUERY SELECT 
        (current_hour || ':00'), 
        FALSE, 
        'Temporariamente reservado';
      current_hour := current_hour + 1;
      CONTINUE;
    END IF;
    
    -- Horário disponível
    RETURN QUERY SELECT 
      (current_hour || ':00'), 
      TRUE, 
      NULL::TEXT;
    
    current_hour := current_hour + 1;
  END LOOP;
END;
$$;