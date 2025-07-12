-- Remove time-related fields from rooms table
ALTER TABLE public.rooms 
DROP COLUMN IF EXISTS open_time,
DROP COLUMN IF EXISTS close_time, 
DROP COLUMN IF EXISTS open_days;

-- Remove time-related fields from equipment table  
ALTER TABLE public.equipment
DROP COLUMN IF EXISTS open_time,
DROP COLUMN IF EXISTS close_time,
DROP COLUMN IF EXISTS open_days;

-- Update get_room_availability function to use room_schedules only
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
  end_hour INTEGER;
BEGIN
  -- Convert day of week number to name
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

  -- Get room schedule for the specific weekday
  SELECT rs.start_time, rs.end_time INTO room_schedule
  FROM room_schedules rs
  WHERE rs.room_id = p_room_id 
    AND rs.weekday = weekday_name::weekday;

  -- If no schedule found for this day, room is closed
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Define start and end hours
  current_hour := EXTRACT(HOUR FROM room_schedule.start_time);
  end_hour := EXTRACT(HOUR FROM room_schedule.end_time);
  
  -- Generate available hours
  WHILE current_hour < end_hour LOOP
    hour_time := (current_hour || ':00')::TIME;
    
    -- Check for confirmed booking at this hour
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
    
    -- Check for cart item (temporary reservation) at this hour
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
    
    -- Hour is available
    RETURN QUERY SELECT 
      (current_hour || ':00'), 
      TRUE, 
      NULL::TEXT;
    
    current_hour := current_hour + 1;
  END LOOP;
END;
$function$;

-- Update get_equipment_availability function to use equipment_schedules only
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
  -- Get equipment info
  SELECT e.quantity INTO equipment_info
  FROM equipment e
  WHERE e.id = p_equipment_id AND e.is_active = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  total_quantity := equipment_info.quantity;

  -- Convert day of week number to name
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

  -- Get equipment schedule for the specific weekday
  SELECT es.start_time, es.end_time INTO equipment_schedule
  FROM equipment_schedules es
  WHERE es.equipment_id = p_equipment_id 
    AND es.weekday = weekday_name::weekday;

  -- If no schedule found for this day, equipment is closed
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Define start and end hours
  current_hour := EXTRACT(HOUR FROM equipment_schedule.start_time);
  end_hour := EXTRACT(HOUR FROM equipment_schedule.end_time);
  
  -- Generate availability for each hour
  WHILE current_hour < end_hour LOOP
    hour_time := (current_hour || ':00')::TIME;
    reserved_quantity := 0;
    cart_reserved_quantity := 0;
    
    -- Check reserved quantity from confirmed bookings
    SELECT COALESCE(SUM(be.quantity), 0) INTO reserved_quantity
    FROM booking_equipment be
    WHERE be.equipment_id = p_equipment_id
      AND DATE(be.start_time) = p_date
      AND be.status NOT IN ('cancelled', 'cancelled_unpaid')
      AND hour_time >= be.start_time::TIME
      AND hour_time < be.end_time::TIME;
    
    -- Check reserved quantity from cart items
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
    
    -- Calculate available quantity
    DECLARE
      available_qty INTEGER := total_quantity - reserved_quantity;
    BEGIN
      IF available_qty >= p_requested_quantity THEN
        -- Hour is available
        RETURN QUERY SELECT 
          (current_hour || ':00'), 
          TRUE, 
          available_qty,
          NULL::TEXT;
      ELSE
        -- Hour is unavailable
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