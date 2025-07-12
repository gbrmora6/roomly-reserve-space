-- Corrigir função get_room_availability para incluir corretamente o horário de fechamento
CREATE OR REPLACE FUNCTION public.get_room_availability(p_room_id uuid, p_date date)
 RETURNS TABLE(hour text, is_available boolean, blocked_reason text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  room_schedule RECORD;
  booking_record RECORD;
  cart_record RECORD;
  current_hour INTEGER;
  hour_time TIME;
  day_of_week INTEGER;
  weekday_name TEXT;
  room_info RECORD;
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

  -- Buscar horários de funcionamento da sala para o dia da semana específico
  SELECT rs.start_time, rs.end_time INTO room_schedule
  FROM room_schedules rs
  WHERE rs.room_id = p_room_id 
    AND rs.weekday = weekday_name::weekday;

  -- Se não há schedule específico para este dia, verificar horários padrão da sala e open_days
  IF NOT FOUND THEN
    SELECT r.open_time, r.close_time, r.open_days INTO room_info
    FROM rooms r 
    WHERE r.id = p_room_id;
    
    -- Verificar se a sala funciona neste dia da semana (usando open_days)
    IF room_info.open_days IS NOT NULL AND NOT (day_of_week = ANY(room_info.open_days)) THEN
      -- Sala não funciona neste dia da semana
      RETURN;
    END IF;
    
    -- Se não tem horários definidos, retorna vazio (sala fechada)
    IF room_info.open_time IS NULL OR room_info.close_time IS NULL THEN
      RETURN;
    END IF;
    
    -- Usar horários padrão da sala
    room_schedule.start_time := room_info.open_time;
    room_schedule.end_time := room_info.close_time;
  END IF;

  -- Definir horário de início e fim
  current_hour := EXTRACT(HOUR FROM room_schedule.start_time);
  end_hour := EXTRACT(HOUR FROM room_schedule.end_time);
  
  -- Gerar horários disponíveis (incluindo o horário de fechamento, mas não ultrapassando)
  WHILE current_hour < end_hour LOOP
    hour_time := (current_hour || ':00')::TIME;
    
    -- Verificar se há booking confirmado neste horário
    SELECT b.id INTO booking_record
    FROM bookings b
    WHERE b.room_id = p_room_id
      AND DATE(b.start_time) = p_date
      AND b.status NOT IN ('cancelled', 'cancelled_unpaid')
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
    
    -- Horário disponível
    RETURN QUERY SELECT 
      (current_hour || ':00'), 
      TRUE, 
      NULL::TEXT;
    
    current_hour := current_hour + 1;
  END LOOP;
END;
$function$;

-- Corrigir função get_equipment_availability para incluir corretamente o horário de fechamento
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
  cart_reserved_quantity INTEGER;
  end_hour INTEGER;
BEGIN
  -- Obter informações do equipamento
  SELECT e.quantity, e.open_time, e.close_time, e.open_days INTO equipment_info
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

  -- Se não há schedule específico para este dia, verificar horários padrão do equipamento e open_days
  IF NOT FOUND THEN
    -- Verificar se o equipamento funciona neste dia da semana (usando open_days)
    IF equipment_info.open_days IS NOT NULL AND NOT (weekday_name::weekday = ANY(equipment_info.open_days)) THEN
      -- Equipamento não funciona neste dia da semana
      RETURN;
    END IF;
    
    -- Se não tem horários definidos, retorna vazio (equipamento fechado)
    IF equipment_info.open_time IS NULL OR equipment_info.close_time IS NULL THEN
      RETURN;
    END IF;
    
    -- Usar horários padrão do equipamento
    equipment_schedule.start_time := equipment_info.open_time;
    equipment_schedule.end_time := equipment_info.close_time;
  END IF;

  -- Definir horário de início e fim
  current_hour := EXTRACT(HOUR FROM equipment_schedule.start_time);
  end_hour := EXTRACT(HOUR FROM equipment_schedule.end_time);
  
  -- Gerar horários disponíveis (incluindo até o horário de fechamento, mas não ultrapassando)
  WHILE current_hour < end_hour LOOP
    hour_time := (current_hour || ':00')::TIME;
    reserved_quantity := 0;
    cart_reserved_quantity := 0;
    
    -- Verificar quantas unidades estão reservadas neste horário (bookings confirmados)
    SELECT COALESCE(SUM(be.quantity), 0) INTO reserved_quantity
    FROM booking_equipment be
    WHERE be.equipment_id = p_equipment_id
      AND DATE(be.start_time) = p_date
      AND be.status NOT IN ('cancelled', 'cancelled_unpaid')
      AND hour_time >= be.start_time::TIME
      AND hour_time < be.end_time::TIME;
    
    -- Verificar quantas unidades estão no carrinho (reserva temporária) neste horário
    SELECT COALESCE(SUM(be.quantity), 0) INTO cart_reserved_quantity
    FROM cart_items ci
    JOIN booking_equipment be ON ci.reserved_equipment_booking_id = be.id
    WHERE be.equipment_id = p_equipment_id
      AND DATE(be.start_time) = p_date
      AND be.status = 'pending'
      AND ci.expires_at > NOW()
      AND hour_time >= be.start_time::TIME
      AND hour_time < be.end_time::TIME;
    
    reserved_quantity := reserved_quantity + cart_reserved_quantity;
    
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