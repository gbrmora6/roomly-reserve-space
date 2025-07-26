-- Corrigir função create_reservations_for_checkout para definir order_id nas reservas
CREATE OR REPLACE FUNCTION public.create_reservations_for_checkout(p_user_id uuid, p_order_id uuid DEFAULT NULL)
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
  -- Obter branch_id do usuário
  SELECT branch_id INTO v_branch_id
  FROM profiles
  WHERE id = p_user_id;
  
  -- Verificar disponibilidade antes de criar reservas
  FOR cart_item IN 
    SELECT * FROM cart_items WHERE user_id = p_user_id
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
    SELECT * FROM cart_items WHERE user_id = p_user_id
  LOOP
    IF cart_item.item_type = 'room' AND 
       cart_item.metadata ? 'start_time' AND 
       cart_item.metadata ? 'end_time' THEN
       
      v_start_time := (cart_item.metadata->>'start_time')::timestamptz;
      v_end_time := (cart_item.metadata->>'end_time')::timestamptz;
      
      INSERT INTO bookings(user_id, room_id, start_time, end_time, status, branch_id, order_id)
      VALUES (p_user_id, cart_item.item_id, v_start_time, v_end_time, 'in_process'::booking_status, v_branch_id, p_order_id)
      RETURNING id INTO v_booking_id;
      
      v_room_ids := array_append(v_room_ids, v_booking_id);
      
      -- Atualizar item do carrinho com o ID da reserva
      UPDATE cart_items 
      SET reserved_booking_id = v_booking_id 
      WHERE id = cart_item.id;
      
    ELSIF cart_item.item_type = 'equipment' AND 
          cart_item.metadata ? 'start_time' AND 
          cart_item.metadata ? 'end_time' THEN
          
      v_start_time := (cart_item.metadata->>'start_time')::timestamptz;
      v_end_time := (cart_item.metadata->>'end_time')::timestamptz;
      
      INSERT INTO booking_equipment(user_id, equipment_id, start_time, end_time, quantity, status, branch_id, order_id)
      VALUES (p_user_id, cart_item.item_id, v_start_time, v_end_time, cart_item.quantity, 'in_process'::booking_status, v_branch_id, p_order_id)
      RETURNING id INTO v_equipment_booking_id;
      
      v_equipment_ids := array_append(v_equipment_ids, v_equipment_booking_id);
      
      -- Atualizar item do carrinho com o ID da reserva de equipamento
      UPDATE cart_items 
      SET reserved_equipment_booking_id = v_equipment_booking_id 
      WHERE id = cart_item.id;
    END IF;
  END LOOP;
  
  success := true;
  room_booking_ids := v_room_ids;
  equipment_booking_ids := v_equipment_ids;
  error_message := null;
  
  RETURN NEXT;
END;
$function$;

-- Melhorar função confirm_cart_payment para buscar também por order_id como fallback
CREATE OR REPLACE FUNCTION public.confirm_cart_payment(p_user_id uuid, p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bookings_updated INTEGER := 0;
  v_equipment_updated INTEGER := 0;
BEGIN
  -- Confirmar salas via IDs do carrinho
  UPDATE bookings
  SET status = 'paid'::booking_status, 
      updated_at = now(),
      order_id = p_order_id
  WHERE id IN (
    SELECT reserved_booking_id FROM cart_items
     WHERE user_id = p_user_id
       AND reserved_booking_id IS NOT NULL
  );
  
  GET DIAGNOSTICS v_bookings_updated = ROW_COUNT;
  
  -- Fallback: confirmar salas por order_id se não houve atualizações via carrinho
  IF v_bookings_updated = 0 THEN
    UPDATE bookings
    SET status = 'paid'::booking_status, 
        updated_at = now()
    WHERE order_id = p_order_id
      AND user_id = p_user_id
      AND status = 'in_process';
      
    GET DIAGNOSTICS v_bookings_updated = ROW_COUNT;
  END IF;

  -- Confirmar equipamentos via IDs do carrinho
  UPDATE booking_equipment
  SET status = 'paid'::booking_status, 
      updated_at = now(),
      order_id = p_order_id
  WHERE id IN (
    SELECT reserved_equipment_booking_id FROM cart_items
     WHERE user_id = p_user_id
       AND reserved_equipment_booking_id IS NOT NULL
  );
  
  GET DIAGNOSTICS v_equipment_updated = ROW_COUNT;
  
  -- Fallback: confirmar equipamentos por order_id se não houve atualizações via carrinho
  IF v_equipment_updated = 0 THEN
    UPDATE booking_equipment
    SET status = 'paid'::booking_status, 
        updated_at = now()
    WHERE order_id = p_order_id
      AND user_id = p_user_id
      AND status = 'in_process';
      
    GET DIAGNOSTICS v_equipment_updated = ROW_COUNT;
  END IF;

  -- Limpar carrinho
  DELETE FROM cart_items
  WHERE user_id = p_user_id;

  -- Log do resultado
  RAISE LOG 'Confirmação de pagamento: % reservas de sala, % reservas de equipamento confirmadas para usuário % e pedido %', 
    v_bookings_updated, v_equipment_updated, p_user_id, p_order_id;

  RETURN true;
END;
$function$;