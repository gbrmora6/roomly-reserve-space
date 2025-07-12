-- Corrigir função get_equipment_availability para resolver erro de tipo COALESCE
CREATE OR REPLACE FUNCTION public.get_equipment_availability(p_equipment_id uuid, p_date date, p_requested_quantity integer DEFAULT 1)
RETURNS TABLE(hour text, is_available boolean, available_quantity integer, blocked_reason text)
LANGUAGE plpgsql
AS $$
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

  -- Gerar horários disponíveis
  current_hour := EXTRACT(HOUR FROM equipment_schedule.start_time);
  
  WHILE current_hour < EXTRACT(HOUR FROM equipment_schedule.end_time) LOOP
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
$$;

-- Corrigir função clean_expired_cart_items para remover itens expirados primeiro
CREATE OR REPLACE FUNCTION public.clean_expired_cart_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  expired_booking_ids uuid[];
  expired_equipment_booking_ids uuid[];
BEGIN
  RAISE LOG 'Iniciando limpeza de itens expirados do carrinho';
  
  -- Primeiro, buscar IDs das reservas que serão afetadas
  SELECT array_agg(reserved_booking_id) INTO expired_booking_ids
  FROM public.cart_items
  WHERE expires_at < now() AND reserved_booking_id IS NOT NULL;
  
  SELECT array_agg(reserved_equipment_booking_id) INTO expired_equipment_booking_ids  
  FROM public.cart_items
  WHERE expires_at < now() AND reserved_equipment_booking_id IS NOT NULL;
  
  -- Remover itens expirados do carrinho PRIMEIRO
  DELETE FROM public.cart_items
  WHERE expires_at < now();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Cart items removidos: %', v_count;
  
  -- Depois cancelar as reservas de sala se ainda existirem
  IF expired_booking_ids IS NOT NULL THEN
    UPDATE public.bookings
    SET status = 'cancelled_unpaid'::booking_status, updated_at = now()
    WHERE id = ANY(expired_booking_ids) AND status = 'pending';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE LOG 'Bookings cancelados: %', v_count;
  END IF;

  -- Cancelar reservas de equipamento se ainda existirem  
  IF expired_equipment_booking_ids IS NOT NULL THEN
    UPDATE public.booking_equipment
    SET status = 'cancelled_unpaid'::booking_status, updated_at = now()
    WHERE id = ANY(expired_equipment_booking_ids) AND status = 'pending';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE LOG 'Equipment bookings cancelados: %', v_count;
  END IF;
  
  RAISE LOG 'Limpeza concluída';
END;
$$;