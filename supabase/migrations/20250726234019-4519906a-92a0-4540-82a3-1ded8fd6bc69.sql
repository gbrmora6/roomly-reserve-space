-- Corrigir o problema das reservas temporárias sendo canceladas prematuramente

-- 1. Recriar a função add_to_cart SEM chamadas de limpeza automática
CREATE OR REPLACE FUNCTION public.add_to_cart(p_user_id uuid, p_item_type text, p_item_id uuid, p_quantity integer DEFAULT 1, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS cart_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_price NUMERIC;
  v_cart_item cart_items;
  v_branch_id uuid;
  v_start_time timestamptz;
  v_end_time timestamptz;
BEGIN
  -- Verificar se é o próprio usuário
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autorizado';
  END IF;

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

  -- Calcular preço para salas e equipamentos baseado na duração
  IF p_item_type IN ('room', 'equipment') AND p_metadata ? 'start_time' AND p_metadata ? 'end_time' THEN
    v_start_time := (p_metadata->>'start_time')::timestamptz;
    v_end_time := (p_metadata->>'end_time')::timestamptz;
    
    -- Validar horários
    IF v_start_time >= v_end_time THEN
      RAISE EXCEPTION 'Horário de início deve ser anterior ao horário de término';
    END IF;

    -- Calcular preço baseado na duração e quantidade (para equipamentos)
    IF p_item_type = 'equipment' THEN
      v_price := v_price * EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600 * p_quantity;
    ELSE
      v_price := v_price * EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600;
    END IF;
  END IF;

  -- Inserir item no carrinho SEM criar reservas temporárias
  -- As reservas serão criadas apenas no checkout via create_reservations_for_checkout
  INSERT INTO cart_items(
    user_id, item_type, item_id, quantity, price, metadata, branch_id,
    expires_at
  ) VALUES (
    p_user_id,
    p_item_type,
    p_item_id,
    p_quantity,
    v_price,
    COALESCE(p_metadata, '{}'::jsonb),
    v_branch_id,
    now() + interval '30 minutes' -- Expiração padrão de 30 minutos
  )
  RETURNING * INTO v_cart_item;

  RAISE LOG 'Item adicionado ao carrinho sem reserva temporária: %', v_cart_item.id;

  RETURN v_cart_item;
END;
$function$;

-- 2. Modificar clean_expired_cart_items para ser mais conservadora
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
  checkout_user_ids uuid[];
BEGIN
  RAISE LOG 'Iniciando limpeza SUPER conservadora de itens expirados do carrinho';
  
  -- Buscar usuários que podem estar em checkout ativo (últimos 60 minutos)
  SELECT array_agg(DISTINCT user_id) INTO checkout_user_ids
  FROM orders 
  WHERE created_at > now() - interval '60 minutes'
  AND status IN ('pending', 'processing', 'in_process');
  
  -- Primeiro, buscar IDs das reservas que serão afetadas, excluindo usuários em checkout
  -- AUMENTAR MARGEM DE SEGURANÇA PARA 30 MINUTOS
  BEGIN
    SELECT array_agg(reserved_booking_id) INTO expired_booking_ids
    FROM cart_items
    WHERE expires_at < now() - interval '30 minutes' -- 30 minutos de margem
      AND reserved_booking_id IS NOT NULL
      AND (checkout_user_ids IS NULL OR NOT (user_id = ANY(checkout_user_ids)));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar booking IDs expirados: %', SQLERRM;
    expired_booking_ids := NULL;
  END;
  
  BEGIN
    SELECT array_agg(reserved_equipment_booking_id) INTO expired_equipment_booking_ids  
    FROM cart_items
    WHERE expires_at < now() - interval '30 minutes' -- 30 minutos de margem
      AND reserved_equipment_booking_id IS NOT NULL
      AND (checkout_user_ids IS NULL OR NOT (user_id = ANY(checkout_user_ids)));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar equipment booking IDs expirados: %', SQLERRM;
    expired_equipment_booking_ids := NULL;
  END;
  
  -- Remover apenas itens realmente expirados (com margem de segurança)
  BEGIN
    DELETE FROM cart_items
    WHERE expires_at < now() - interval '30 minutes' -- 30 minutos de margem
      AND (checkout_user_ids IS NULL OR NOT (user_id = ANY(checkout_user_ids)));
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE LOG 'Cart items removidos: %', v_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao remover cart items: %', SQLERRM;
  END;
  
  -- Cancelar reservas de sala se ainda existirem E não estiverem sendo processadas
  IF expired_booking_ids IS NOT NULL AND array_length(expired_booking_ids, 1) > 0 THEN
    BEGIN
      UPDATE bookings
      SET status = 'cancelled'::booking_status
      WHERE id = ANY(expired_booking_ids) 
        AND status = 'in_process'
        AND NOT EXISTS (
          SELECT 1 FROM orders o 
          WHERE o.user_id = bookings.user_id 
          AND o.created_at > now() - interval '60 minutes'
          AND o.status IN ('pending', 'processing', 'in_process')
        );
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE LOG 'Bookings cancelados: %', v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Erro ao cancelar bookings: %', SQLERRM;
    END;
  END IF;

  -- Cancelar reservas de equipamento se ainda existirem E não estiverem sendo processadas 
  IF expired_equipment_booking_ids IS NOT NULL AND array_length(expired_equipment_booking_ids, 1) > 0 THEN
    BEGIN
      UPDATE booking_equipment
      SET status = 'cancelled'::booking_status
      WHERE id = ANY(expired_equipment_booking_ids) 
        AND status = 'in_process'
        AND NOT EXISTS (
          SELECT 1 FROM orders o 
          WHERE o.user_id = booking_equipment.user_id 
          AND o.created_at > now() - interval '60 minutes'
          AND o.status IN ('pending', 'processing', 'in_process')
        );
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE LOG 'Equipment bookings cancelados: %', v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Erro ao cancelar equipment bookings: %', SQLERRM;
    END;
  END IF;
  
  RAISE LOG 'Limpeza SUPER conservadora concluída';
END;
$function$;

-- 3. Garantir que create_reservations_for_checkout mantenha status in_process
CREATE OR REPLACE FUNCTION public.create_reservations_for_checkout(p_user_id uuid)
 RETURNS TABLE(success boolean, room_booking_ids uuid[], equipment_booking_ids uuid[], error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cart_item RECORD;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_branch_id uuid;
  v_booking_id uuid;
  v_equipment_booking_id uuid;
  v_room_ids uuid[] := '{}';
  v_equipment_ids uuid[] := '{}';
  v_conflicts_count INTEGER;
  v_total_reserved INTEGER;
  v_available_quantity INTEGER;
BEGIN
  -- Iniciar transação explícita
  BEGIN
    -- Obter branch_id do usuário
    SELECT branch_id INTO v_branch_id
    FROM profiles
    WHERE id = p_user_id;
    
    -- Log início da função
    RAISE LOG 'Iniciando create_reservations_for_checkout para usuário: %', p_user_id;
    
    -- Verificar disponibilidade antes de criar reservas
    FOR cart_item IN 
      SELECT * FROM cart_items WHERE user_id = p_user_id AND expires_at > now()
    LOOP
      IF cart_item.item_type IN ('room', 'equipment') AND 
         cart_item.metadata ? 'start_time' AND 
         cart_item.metadata ? 'end_time' THEN
         
        v_start_time := (cart_item.metadata->>'start_time')::timestamptz;
        v_end_time := (cart_item.metadata->>'end_time')::timestamptz;
        
        IF cart_item.item_type = 'room' THEN
          -- Verificar conflitos de sala
          SELECT COUNT(*) INTO v_conflicts_count
          FROM bookings b
          WHERE b.room_id = cart_item.item_id
          AND b.status IN ('paid', 'in_process')
          AND (
            (b.start_time <= v_start_time AND b.end_time > v_start_time)
            OR (b.start_time < v_end_time AND b.end_time >= v_end_time)
            OR (b.start_time >= v_start_time AND b.end_time <= v_end_time)
          );
          
          IF v_conflicts_count > 0 THEN
            success := false;
            error_message := 'Sala não está mais disponível. Outro usuário fez a reserva antes de você.';
            RETURN NEXT;
            RETURN;
          END IF;
          
        ELSIF cart_item.item_type = 'equipment' THEN
          -- Verificar conflitos de equipamento
          SELECT COALESCE(SUM(be.quantity), 0) INTO v_total_reserved
          FROM booking_equipment be
          WHERE be.equipment_id = cart_item.item_id
          AND be.status IN ('paid', 'in_process')
          AND (
            (be.start_time <= v_start_time AND be.end_time > v_start_time)
            OR (be.start_time < v_end_time AND be.end_time >= v_end_time)
            OR (be.start_time >= v_start_time AND be.end_time <= v_end_time)
          );
          
          SELECT quantity INTO v_available_quantity
          FROM equipment
          WHERE id = cart_item.item_id;
          
          IF (v_total_reserved + cart_item.quantity) > v_available_quantity THEN
            success := false;
            error_message := 'Equipamento não está mais disponível na quantidade solicitada. Outro usuário fez a reserva antes de você.';
            RETURN NEXT;
            RETURN;
          END IF;
        END IF;
      END IF;
    END LOOP;
    
    -- Se chegou até aqui, todos os itens estão disponíveis - criar reservas
    FOR cart_item IN 
      SELECT * FROM cart_items WHERE user_id = p_user_id AND expires_at > now()
    LOOP
      IF cart_item.item_type = 'room' AND 
         cart_item.metadata ? 'start_time' AND 
         cart_item.metadata ? 'end_time' THEN
         
        v_start_time := (cart_item.metadata->>'start_time')::timestamptz;
        v_end_time := (cart_item.metadata->>'end_time')::timestamptz;
        
        -- Criar reserva de sala com status IN_PROCESS
        INSERT INTO bookings(user_id, room_id, start_time, end_time, status, branch_id)
        VALUES (p_user_id, cart_item.item_id, v_start_time, v_end_time, 'in_process'::booking_status, v_branch_id)
        RETURNING id INTO v_booking_id;
        
        RAISE LOG 'Reserva de sala criada: % com status IN_PROCESS', v_booking_id;
        
        v_room_ids := array_append(v_room_ids, v_booking_id);
        
        -- Atualizar item do carrinho com o ID da reserva e ESTENDER expiração
        UPDATE cart_items 
        SET reserved_booking_id = v_booking_id,
            expires_at = now() + interval '60 minutes' -- Estender para 60 minutos durante checkout
        WHERE id = cart_item.id;
        
        RAISE LOG 'Cart item atualizado com reserved_booking_id: %', v_booking_id;
        
      ELSIF cart_item.item_type = 'equipment' AND 
            cart_item.metadata ? 'start_time' AND 
            cart_item.metadata ? 'end_time' THEN
            
        v_start_time := (cart_item.metadata->>'start_time')::timestamptz;
        v_end_time := (cart_item.metadata->>'end_time')::timestamptz;
        
        -- Criar reserva de equipamento com status IN_PROCESS
        INSERT INTO booking_equipment(user_id, equipment_id, start_time, end_time, quantity, status, branch_id)
        VALUES (p_user_id, cart_item.item_id, v_start_time, v_end_time, cart_item.quantity, 'in_process'::booking_status, v_branch_id)
        RETURNING id INTO v_equipment_booking_id;
        
        RAISE LOG 'Reserva de equipamento criada: % com status IN_PROCESS', v_equipment_booking_id;
        
        v_equipment_ids := array_append(v_equipment_ids, v_equipment_booking_id);
        
        -- Atualizar item do carrinho com o ID da reserva de equipamento e ESTENDER expiração
        UPDATE cart_items 
        SET reserved_equipment_booking_id = v_equipment_booking_id,
            expires_at = now() + interval '60 minutes' -- Estender para 60 minutos durante checkout
        WHERE id = cart_item.id;
        
        RAISE LOG 'Cart item atualizado com reserved_equipment_booking_id: %', v_equipment_booking_id;
      END IF;
    END LOOP;
    
    success := true;
    room_booking_ids := v_room_ids;
    equipment_booking_ids := v_equipment_ids;
    error_message := null;
    
    RAISE LOG 'create_reservations_for_checkout concluída com sucesso. Salas: %, Equipamentos: %', array_length(v_room_ids, 1), array_length(v_equipment_ids, 1);
    
    RETURN NEXT;
    
  EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, fazer rollback automático e retornar erro
    RAISE LOG 'Erro em create_reservations_for_checkout: %', SQLERRM;
    success := false;
    room_booking_ids := '{}';
    equipment_booking_ids := '{}';
    error_message := 'Erro interno ao criar reservas: ' || SQLERRM;
    RETURN NEXT;
  END;
END;
$function$;