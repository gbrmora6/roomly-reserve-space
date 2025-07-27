-- Atualizar a função confirm_cart_payment para usar múltiplas estratégias de identificação
CREATE OR REPLACE FUNCTION public.confirm_cart_payment(p_user_id uuid, p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bookings_updated INTEGER := 0;
  v_equipment_updated INTEGER := 0;
  v_cart_items_count INTEGER := 0;
  v_order_created_at timestamptz;
BEGIN
  -- Log inicial
  RAISE LOG 'Iniciando confirm_cart_payment para usuário % e pedido %', p_user_id, p_order_id;
  
  -- Buscar data de criação do pedido para usar como referência temporal
  SELECT created_at INTO v_order_created_at
  FROM orders 
  WHERE id = p_order_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE LOG 'Pedido não encontrado: %', p_order_id;
    RETURN false;
  END IF;
  
  RAISE LOG 'Pedido criado em: %', v_order_created_at;
  
  -- Verificar se ainda há itens no carrinho
  SELECT COUNT(*) INTO v_cart_items_count
  FROM cart_items 
  WHERE user_id = p_user_id;
  
  RAISE LOG 'Itens no carrinho: %', v_cart_items_count;
  
  -- ESTRATÉGIA 1: Confirmar salas via IDs do carrinho (se carrinho ainda existir)
  IF v_cart_items_count > 0 THEN
    RAISE LOG 'Usando estratégia 1: IDs do carrinho';
    
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
    RAISE LOG 'Salas atualizadas via carrinho: %', v_bookings_updated;
    
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
    RAISE LOG 'Equipamentos atualizados via carrinho: %', v_equipment_updated;
  END IF;
  
  -- ESTRATÉGIA 2: Se não conseguiu atualizar via carrinho, usar order_id
  IF v_bookings_updated = 0 THEN
    RAISE LOG 'Usando estratégia 2: order_id nas reservas';
    
    UPDATE bookings
    SET status = 'paid'::booking_status, 
        updated_at = now()
    WHERE order_id = p_order_id
      AND user_id = p_user_id
      AND status = 'in_process';
      
    GET DIAGNOSTICS v_bookings_updated = ROW_COUNT;
    RAISE LOG 'Salas atualizadas via order_id: %', v_bookings_updated;
  END IF;
  
  IF v_equipment_updated = 0 THEN
    UPDATE booking_equipment
    SET status = 'paid'::booking_status, 
        updated_at = now()
    WHERE order_id = p_order_id
      AND user_id = p_user_id
      AND status = 'in_process';
      
    GET DIAGNOSTICS v_equipment_updated = ROW_COUNT;
    RAISE LOG 'Equipamentos atualizados via order_id: %', v_equipment_updated;
  END IF;
  
  -- ESTRATÉGIA 3: Se ainda não conseguiu, buscar por timestamp e usuário
  IF v_bookings_updated = 0 THEN
    RAISE LOG 'Usando estratégia 3: timestamp e usuário para salas';
    
    UPDATE bookings
    SET status = 'paid'::booking_status, 
        updated_at = now(),
        order_id = p_order_id
    WHERE user_id = p_user_id
      AND status = 'in_process'
      AND created_at BETWEEN (v_order_created_at - interval '2 hours') AND (v_order_created_at + interval '1 hour')
      AND order_id IS NULL; -- Só atualizar se ainda não tem order_id
      
    GET DIAGNOSTICS v_bookings_updated = ROW_COUNT;
    RAISE LOG 'Salas atualizadas via timestamp: %', v_bookings_updated;
  END IF;
  
  IF v_equipment_updated = 0 THEN
    RAISE LOG 'Usando estratégia 3: timestamp e usuário para equipamentos';
    
    UPDATE booking_equipment
    SET status = 'paid'::booking_status, 
        updated_at = now(),
        order_id = p_order_id
    WHERE user_id = p_user_id
      AND status = 'in_process'
      AND created_at BETWEEN (v_order_created_at - interval '2 hours') AND (v_order_created_at + interval '1 hour')
      AND order_id IS NULL; -- Só atualizar se ainda não tem order_id
      
    GET DIAGNOSTICS v_equipment_updated = ROW_COUNT;
    RAISE LOG 'Equipamentos atualizados via timestamp: %', v_equipment_updated;
  END IF;

  -- Limpar carrinho
  DELETE FROM cart_items
  WHERE user_id = p_user_id;

  -- Log do resultado final
  RAISE LOG 'Confirmação de pagamento concluída: % reservas de sala, % reservas de equipamento confirmadas para usuário % e pedido %', 
    v_bookings_updated, v_equipment_updated, p_user_id, p_order_id;

  RETURN true;
END;
$function$;