-- Corrigir função create_reservations_for_checkout para garantir transação atômica
DROP FUNCTION IF EXISTS public.create_reservations_for_checkout(uuid);

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
        
        -- Criar reserva de sala
        INSERT INTO bookings(user_id, room_id, start_time, end_time, status, branch_id)
        VALUES (p_user_id, cart_item.item_id, v_start_time, v_end_time, 'in_process'::booking_status, v_branch_id)
        RETURNING id INTO v_booking_id;
        
        RAISE LOG 'Reserva de sala criada: % com status in_process', v_booking_id;
        
        v_room_ids := array_append(v_room_ids, v_booking_id);
        
        -- Atualizar item do carrinho com o ID da reserva na mesma transação
        UPDATE cart_items 
        SET reserved_booking_id = v_booking_id,
            expires_at = now() + interval '30 minutes', -- Estender expiração durante checkout
            updated_at = now()
        WHERE id = cart_item.id;
        
        RAISE LOG 'Cart item atualizado com reserved_booking_id: %', v_booking_id;
        
      ELSIF cart_item.item_type = 'equipment' AND 
            cart_item.metadata ? 'start_time' AND 
            cart_item.metadata ? 'end_time' THEN
            
        v_start_time := (cart_item.metadata->>'start_time')::timestamptz;
        v_end_time := (cart_item.metadata->>'end_time')::timestamptz;
        
        -- Criar reserva de equipamento
        INSERT INTO booking_equipment(user_id, equipment_id, start_time, end_time, quantity, status, branch_id)
        VALUES (p_user_id, cart_item.item_id, v_start_time, v_end_time, cart_item.quantity, 'in_process'::booking_status, v_branch_id)
        RETURNING id INTO v_equipment_booking_id;
        
        RAISE LOG 'Reserva de equipamento criada: % com status in_process', v_equipment_booking_id;
        
        v_equipment_ids := array_append(v_equipment_ids, v_equipment_booking_id);
        
        -- Atualizar item do carrinho com o ID da reserva de equipamento na mesma transação
        UPDATE cart_items 
        SET reserved_equipment_booking_id = v_equipment_booking_id,
            expires_at = now() + interval '30 minutes', -- Estender expiração durante checkout
            updated_at = now()
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

-- Melhorar a função clean_expired_cart_items para ser mais conservadora
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
  RAISE LOG 'Iniciando limpeza conservadora de itens expirados do carrinho';
  
  -- Buscar usuários que podem estar em checkout ativo (últimos 30 minutos)
  SELECT array_agg(DISTINCT user_id) INTO checkout_user_ids
  FROM orders 
  WHERE created_at > now() - interval '30 minutes'
  AND status IN ('pending', 'processing', 'in_process');
  
  -- Primeiro, buscar IDs das reservas que serão afetadas, excluindo usuários em checkout
  -- AUMENTAR MARGEM DE SEGURANÇA PARA 10 MINUTOS
  BEGIN
    SELECT array_agg(reserved_booking_id) INTO expired_booking_ids
    FROM cart_items
    WHERE expires_at < now() - interval '10 minutes' -- 10 minutos de margem
      AND reserved_booking_id IS NOT NULL
      AND (checkout_user_ids IS NULL OR NOT (user_id = ANY(checkout_user_ids)));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar booking IDs expirados: %', SQLERRM;
    expired_booking_ids := NULL;
  END;
  
  BEGIN
    SELECT array_agg(reserved_equipment_booking_id) INTO expired_equipment_booking_ids  
    FROM cart_items
    WHERE expires_at < now() - interval '10 minutes' -- 10 minutos de margem
      AND reserved_equipment_booking_id IS NOT NULL
      AND (checkout_user_ids IS NULL OR NOT (user_id = ANY(checkout_user_ids)));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar equipment booking IDs expirados: %', SQLERRM;
    expired_equipment_booking_ids := NULL;
  END;
  
  -- Remover apenas itens realmente expirados (com margem de segurança)
  BEGIN
    DELETE FROM cart_items
    WHERE expires_at < now() - interval '10 minutes' -- 10 minutos de margem
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
      SET status = 'cancelled'::booking_status, updated_at = now()
      WHERE id = ANY(expired_booking_ids) 
        AND status = 'in_process'
        AND NOT EXISTS (
          SELECT 1 FROM orders o 
          WHERE o.user_id = bookings.user_id 
          AND o.created_at > now() - interval '30 minutes'
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
      SET status = 'cancelled'::booking_status, updated_at = now()
      WHERE id = ANY(expired_equipment_booking_ids) 
        AND status = 'in_process'
        AND NOT EXISTS (
          SELECT 1 FROM orders o 
          WHERE o.user_id = booking_equipment.user_id 
          AND o.created_at > now() - interval '30 minutes'
          AND o.status IN ('pending', 'processing', 'in_process')
        );
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE LOG 'Equipment bookings cancelados: %', v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Erro ao cancelar equipment bookings: %', SQLERRM;
    END;
  END IF;
  
  RAISE LOG 'Limpeza conservadora concluída';
END;
$function$;