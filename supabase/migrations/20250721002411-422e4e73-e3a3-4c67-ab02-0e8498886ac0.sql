
-- Fix get_room_availability function to use correct booking status values
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
    cart_exists BOOLEAN;
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
        cart_exists := FALSE;
        
        -- Verificar se há reserva confirmada neste horário (usando status corretos)
        SELECT EXISTS(
            SELECT 1 FROM bookings b
            WHERE b.room_id = p_room_id
                AND DATE(b.start_time) = p_date
                AND b.status NOT IN ('cancelled', 'recused')
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
        
        -- Verificar se há item no carrinho (reserva temporária) neste horário
        SELECT EXISTS(
            SELECT 1 FROM cart_items ci
            JOIN bookings b ON ci.reserved_booking_id = b.id
            WHERE b.room_id = p_room_id
                AND DATE(b.start_time) = p_date
                AND b.status = 'in_process'
                AND ci.expires_at > NOW()
                AND (
                    (b.start_time::TIME <= hour_time AND b.end_time::TIME > hour_time)
                    OR (b.start_time::TIME < (hour_time + '1 hour'::INTERVAL)::TIME AND b.end_time::TIME >= (hour_time + '1 hour'::INTERVAL)::TIME)
                    OR (b.start_time::TIME >= hour_time AND b.end_time::TIME <= (hour_time + '1 hour'::INTERVAL)::TIME)
                )
        ) INTO cart_exists;
        
        IF cart_exists THEN
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
    
    RAISE LOG 'Função get_room_availability concluída para sala % em %', p_room_id, p_date;
END;
$function$;

-- Fix get_equipment_availability function to use correct booking status values
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
    cart_reserved_quantity := 0;
    
    -- Verificar quantas unidades estão reservadas neste horário (bookings confirmados)
    SELECT COALESCE(SUM(be.quantity), 0) INTO reserved_quantity
    FROM booking_equipment be
    WHERE be.equipment_id = p_equipment_id
      AND DATE(be.start_time) = p_date
      AND be.status NOT IN ('cancelled', 'recused')
      AND (
          (be.start_time::TIME <= hour_time AND be.end_time::TIME > hour_time)
          OR (be.start_time::TIME < (hour_time + '1 hour'::INTERVAL)::TIME AND be.end_time::TIME >= (hour_time + '1 hour'::INTERVAL)::TIME)
          OR (be.start_time::TIME >= hour_time AND be.end_time::TIME <= (hour_time + '1 hour'::INTERVAL)::TIME)
      );
    
    -- Verificar quantas unidades estão no carrinho (reserva temporária) neste horário
    SELECT COALESCE(SUM(be.quantity), 0) INTO cart_reserved_quantity
    FROM cart_items ci
    JOIN booking_equipment be ON ci.reserved_equipment_booking_id = be.id
    WHERE be.equipment_id = p_equipment_id
      AND DATE(be.start_time) = p_date
      AND be.status = 'in_process'
      AND ci.expires_at > NOW()
      AND (
          (be.start_time::TIME <= hour_time AND be.end_time::TIME > hour_time)
          OR (be.start_time::TIME < (hour_time + '1 hour'::INTERVAL)::TIME AND be.end_time::TIME >= (hour_time + '1 hour'::INTERVAL)::TIME)
          OR (be.start_time::TIME >= hour_time AND be.end_time::TIME <= (hour_time + '1 hour'::INTERVAL)::TIME)
      );
    
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

-- Fix clean_expired_cart_items function to use correct booking status values
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
  
  -- Primeiro, buscar IDs das reservas que serão afetadas
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
      SET status = 'cancelled'::booking_status, updated_at = now()
      WHERE id = ANY(expired_booking_ids) AND status = 'in_process';
      
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
      SET status = 'cancelled'::booking_status, updated_at = now()
      WHERE id = ANY(expired_equipment_booking_ids) AND status = 'in_process';
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE LOG 'Equipment bookings cancelados: %', v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Erro ao cancelar equipment bookings: %', SQLERRM;
    END;
  END IF;
  
  RAISE LOG 'Limpeza concluída';
END;
$function$;

-- Fix add_to_cart function to use correct booking status values
CREATE OR REPLACE FUNCTION public.add_to_cart(p_user_id uuid, p_item_type text, p_item_id uuid, p_quantity integer DEFAULT 1, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS cart_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_price NUMERIC;
  v_cart_item cart_items;
  v_booking_id uuid;
  v_equipment_booking_id uuid;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_branch_id uuid;
BEGIN
  -- Verificar se é o próprio usuário
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autorizado';
  END IF;

  -- Limpar itens expirados antes de adicionar novo
  PERFORM clean_expired_cart_items();

  -- Obter branch_id do usuário
  SELECT branch_id INTO v_branch_id
  FROM profiles
  WHERE id = auth.uid();

  -- Determinar preço baseado no tipo de item
  CASE p_item_type
    WHEN 'room' THEN
      SELECT price_per_hour INTO v_price 
      FROM rooms 
      WHERE id = p_item_id AND is_active = true;
    WHEN 'equipment' THEN
      SELECT price_per_hour INTO v_price 
      FROM equipment 
      WHERE id = p_item_id AND is_active = true;
    WHEN 'product' THEN
      SELECT price INTO v_price 
      FROM products 
      WHERE id = p_item_id AND is_active = true;
    ELSE
      RAISE EXCEPTION 'Tipo de item inválido: %', p_item_type;
  END CASE;

  -- Verificar se o item foi encontrado
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Item não encontrado ou inativo';
  END IF;

  -- Processar reservas para salas e equipamentos
  IF p_item_type IN ('room', 'equipment') AND p_metadata ? 'start_time' AND p_metadata ? 'end_time' THEN
    v_start_time := (p_metadata->>'start_time')::timestamptz;
    v_end_time := (p_metadata->>'end_time')::timestamptz;
    
    -- Validar horários
    IF v_start_time >= v_end_time THEN
      RAISE EXCEPTION 'Horário de início deve ser anterior ao horário de término';
    END IF;

    IF p_item_type = 'room' THEN
      -- Verificar disponibilidade da sala (usando verificação de sobreposição robusta)
      IF EXISTS (
        SELECT 1 FROM bookings
        WHERE room_id = p_item_id
        AND status NOT IN ('cancelled', 'recused')
        AND (
          (start_time <= v_start_time AND end_time > v_start_time)
          OR (start_time < v_end_time AND end_time >= v_end_time)
          OR (start_time >= v_start_time AND end_time <= v_end_time)
        )
      ) THEN
        RAISE EXCEPTION 'Horário não disponível para esta sala';
      END IF;

      -- Verificar se não há reserva temporária no carrinho
      IF EXISTS (
        SELECT 1 FROM cart_items ci
        JOIN bookings b ON ci.reserved_booking_id = b.id
        WHERE b.room_id = p_item_id
        AND b.status = 'in_process'
        AND ci.expires_at > NOW()
        AND (
          (b.start_time <= v_start_time AND b.end_time > v_start_time)
          OR (b.start_time < v_end_time AND b.end_time >= v_end_time)
          OR (b.start_time >= v_start_time AND b.end_time <= v_end_time)
        )
      ) THEN
        RAISE EXCEPTION 'Horário temporariamente reservado por outro usuário';
      END IF;

      -- Criar reserva temporária
      INSERT INTO bookings(user_id, room_id, start_time, end_time, status, branch_id)
      VALUES (p_user_id, p_item_id, v_start_time, v_end_time, 'in_process'::booking_status, v_branch_id)
      RETURNING id INTO v_booking_id;

      -- Calcular preço baseado na duração
      v_price := v_price * EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600;

    ELSIF p_item_type = 'equipment' THEN
      -- Verificar disponibilidade do equipamento
      IF EXISTS (
        SELECT 1 FROM (
          SELECT SUM(quantity) as total_reserved
          FROM booking_equipment
          WHERE equipment_id = p_item_id
          AND status NOT IN ('cancelled', 'recused')
          AND (
            (start_time <= v_start_time AND end_time > v_start_time)
            OR (start_time < v_end_time AND end_time >= v_end_time)
            OR (start_time >= v_start_time AND end_time <= v_end_time)
          )
        ) reserved
        WHERE (reserved.total_reserved + p_quantity) > (SELECT quantity FROM equipment WHERE id = p_item_id)
      ) THEN
        RAISE EXCEPTION 'Quantidade não disponível para este equipamento no horário selecionado';
      END IF;

      -- Criar reserva de equipamento temporária
      INSERT INTO booking_equipment(user_id, equipment_id, start_time, end_time, quantity, status, branch_id)
      VALUES (p_user_id, p_item_id, v_start_time, v_end_time, p_quantity, 'in_process'::booking_status, v_branch_id)
      RETURNING id INTO v_equipment_booking_id;

      -- Calcular preço baseado na duração e quantidade
      v_price := v_price * EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600 * p_quantity;
    END IF;
  END IF;

  -- Inserir item no carrinho
  INSERT INTO cart_items(
    user_id, item_type, item_id, quantity, price, metadata,
    reserved_booking_id, reserved_equipment_booking_id, expires_at, branch_id
  ) VALUES (
    p_user_id,
    p_item_type,
    p_item_id,
    p_quantity,
    v_price,
    COALESCE(p_metadata, '{}'::jsonb),
    v_booking_id,
    v_equipment_booking_id,
    CASE 
      WHEN p_item_type IN ('room', 'equipment') THEN now() + interval '15 minutes'
      ELSE NULL
    END,
    v_branch_id
  )
  RETURNING * INTO v_cart_item;

  RETURN v_cart_item;
END;
$function$;

-- Fix remove_from_cart function to use correct booking status values
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
    SET status = 'cancelled'::booking_status, updated_at = now()
    WHERE id = v_booking_id;
    RAISE LOG 'Reserva de sala cancelada: %', v_booking_id;
  END IF;

  -- Cancelar reserva de equipamento se existir
  IF v_equipment_booking_id IS NOT NULL THEN
    UPDATE booking_equipment 
    SET status = 'cancelled'::booking_status, updated_at = now()
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

-- Fix clear_cart function to use correct booking status values
CREATE OR REPLACE FUNCTION public.clear_cart(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se é o próprio usuário
  IF p_user_id != auth.uid() THEN
    RETURN false;
  END IF;

  -- Cancelar todas as reservas de salas do carrinho
  UPDATE bookings
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_booking_id 
    FROM cart_items
    WHERE user_id = p_user_id 
    AND reserved_booking_id IS NOT NULL
  );

  -- Cancelar todas as reservas de equipamentos do carrinho
  UPDATE booking_equipment
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_equipment_booking_id 
    FROM cart_items
    WHERE user_id = p_user_id 
    AND reserved_equipment_booking_id IS NOT NULL
  );

  -- Remover todos os itens do carrinho do usuário
  DELETE FROM cart_items
  WHERE user_id = p_user_id;

  RETURN true;
END;
$function$;

-- Fix confirm_cart_payment function to use correct booking status values
CREATE OR REPLACE FUNCTION public.confirm_cart_payment(p_user_id uuid, p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Confirmar salas
  UPDATE bookings
  SET status = 'paid'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_booking_id FROM cart_items
     WHERE user_id = p_user_id
       AND reserved_booking_id IS NOT NULL
  );

  -- Confirmar equipamentos
  UPDATE booking_equipment
  SET status = 'paid'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_equipment_booking_id FROM cart_items
     WHERE user_id = p_user_id
       AND reserved_equipment_booking_id IS NOT NULL
  );

  -- Limpar carrinho
  DELETE FROM cart_items
  WHERE user_id = p_user_id;

  RETURN true;
END;
$function$;
