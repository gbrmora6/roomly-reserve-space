-- Primeiro, remover todas as versões existentes da função create_reservations_for_checkout
DROP FUNCTION IF EXISTS public.create_reservations_for_checkout(uuid);
DROP FUNCTION IF EXISTS public.create_reservations_for_checkout(uuid, uuid);

-- Recriar a função com a assinatura correta (sem p_order_id por enquanto para manter compatibilidade)
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
      
      INSERT INTO bookings(user_id, room_id, start_time, end_time, status, branch_id)
      VALUES (p_user_id, cart_item.item_id, v_start_time, v_end_time, 'in_process'::booking_status, v_branch_id)
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
      
      INSERT INTO booking_equipment(user_id, equipment_id, start_time, end_time, quantity, status, branch_id)
      VALUES (p_user_id, cart_item.item_id, v_start_time, v_end_time, cart_item.quantity, 'in_process'::booking_status, v_branch_id)
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