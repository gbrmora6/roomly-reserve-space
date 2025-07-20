-- Corrigir funções do carrinho para usar status 'recused' ao invés de 'cancelled_unpaid'

CREATE OR REPLACE FUNCTION public.remove_from_cart(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_id uuid;
  v_equipment_booking_id uuid;
  v_user_id uuid;
BEGIN
  -- Buscar dados do item do carrinho e verificar se pertence ao usuário autenticado
  SELECT reserved_booking_id, reserved_equipment_booking_id, user_id 
  INTO v_booking_id, v_equipment_booking_id, v_user_id
  FROM cart_items 
  WHERE id = p_id;

  -- Se não encontrou o item, retorna false
  IF NOT FOUND THEN
    RAISE LOG 'Item do carrinho não encontrado: %', p_id;
    RETURN false;
  END IF;

  -- Verificar se é o próprio usuário ou admin
  IF v_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE LOG 'Usuário % não autorizado a remover item %', auth.uid(), p_id;
    RETURN false;
  END IF;

  -- Cancelar reserva de sala se existir
  IF v_booking_id IS NOT NULL THEN
    UPDATE bookings 
    SET status = 'recused'::booking_status, updated_at = now()
    WHERE id = v_booking_id;
    RAISE LOG 'Reserva de sala cancelada: %', v_booking_id;
  END IF;

  -- Cancelar reserva de equipamento se existir
  IF v_equipment_booking_id IS NOT NULL THEN
    UPDATE booking_equipment 
    SET status = 'recused'::booking_status, updated_at = now()
    WHERE id = v_equipment_booking_id;
    RAISE LOG 'Reserva de equipamento cancelada: %', v_equipment_booking_id;
  END IF;

  -- Remover item do carrinho
  DELETE FROM cart_items 
  WHERE id = p_id;

  -- Verificar se foi removido
  IF NOT FOUND THEN
    RAISE LOG 'Falha ao remover item do carrinho: %', p_id;
    RETURN false;
  END IF;

  RAISE LOG 'Item removido do carrinho com sucesso: %', p_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clean_expired_cart_items()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
  expired_booking_ids uuid[];
  expired_equipment_booking_ids uuid[];
BEGIN
  RAISE LOG 'Iniciando limpeza de itens expirados do carrinho';
  
  -- Primeiro, buscar IDs das reservas que serão afetadas, com tratamento seguro
  BEGIN
    SELECT array_agg(reserved_booking_id) INTO expired_booking_ids
    FROM cart_items
    WHERE expires_at < now() 
      AND reserved_booking_id IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar booking IDs expirados: %', SQLERRM;
    expired_booking_ids := NULL;
  END;
  
  BEGIN
    SELECT array_agg(reserved_equipment_booking_id) INTO expired_equipment_booking_ids  
    FROM cart_items
    WHERE expires_at < now() 
      AND reserved_equipment_booking_id IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar equipment booking IDs expirados: %', SQLERRM;
    expired_equipment_booking_ids := NULL;
  END;
  
  -- Remover itens expirados do carrinho PRIMEIRO
  BEGIN
    DELETE FROM cart_items
    WHERE expires_at < now();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE LOG 'Cart items removidos: %', v_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao remover cart items: %', SQLERRM;
  END;
  
  -- Depois cancelar as reservas de sala se ainda existirem
  IF expired_booking_ids IS NOT NULL AND array_length(expired_booking_ids, 1) > 0 THEN
    BEGIN
      UPDATE bookings
      SET status = 'recused'::booking_status, updated_at = now()
      WHERE id = ANY(expired_booking_ids) AND status = 'pending';
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE LOG 'Bookings cancelados: %', v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Erro ao cancelar bookings: %', SQLERRM;
    END;
  END IF;

  -- Cancelar reservas de equipamento se ainda existirem  
  IF expired_equipment_booking_ids IS NOT NULL AND array_length(expired_equipment_booking_ids, 1) > 0 THEN
    BEGIN
      UPDATE booking_equipment
      SET status = 'recused'::booking_status, updated_at = now()
      WHERE id = ANY(expired_equipment_booking_ids) AND status = 'pending';
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE LOG 'Equipment bookings cancelados: %', v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Erro ao cancelar equipment bookings: %', SQLERRM;
    END;
  END IF;
  
  RAISE LOG 'Limpeza concluída';
END;
$function$;

-- Atualizar função get_room_availability para usar status corretos
CREATE OR REPLACE FUNCTION public.get_room_availability(p_room_id uuid, p_date date)
 RETURNS TABLE(hour text, is_available boolean, blocked_reason text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
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
  
  -- Generate available hours (INCLUSIVE do horário de fechamento)
  WHILE current_hour <= end_hour LOOP
    hour_time := (current_hour || ':00')::TIME;
    
    -- Check for confirmed booking at this hour
    SELECT b.id INTO booking_record
    FROM bookings b
    WHERE b.room_id = p_room_id
      AND DATE(b.start_time) = p_date
      AND b.status NOT IN ('recused')
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
    
    -- Check for cart reservation at this hour
    SELECT ci.id INTO cart_record
    FROM cart_items ci
    JOIN bookings b ON ci.reserved_booking_id = b.id
    WHERE b.room_id = p_room_id
      AND DATE(b.start_time) = p_date
      AND b.status = 'pending'
      AND hour_time >= b.start_time::TIME
      AND hour_time < b.end_time::TIME
      AND ci.expires_at > now()
    LIMIT 1;
    
    IF FOUND THEN
      RETURN QUERY SELECT 
        (current_hour || ':00'), 
        FALSE, 
        'Temporariamente reservado';
    ELSE
      RETURN QUERY SELECT 
        (current_hour || ':00'), 
        TRUE, 
        NULL::text;
    END IF;
    
    current_hour := current_hour + 1;
  END LOOP;
END;
$function$;