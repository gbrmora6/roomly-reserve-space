-- Atualizar função cancel_expired_pix_reservations para incluir produtos
CREATE OR REPLACE FUNCTION public.cancel_expired_pix_reservations()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
  expired_order_ids uuid[];
BEGIN
  -- Buscar IDs dos pedidos PIX expirados
  SELECT array_agg(o.id) INTO expired_order_ids
  FROM orders o
  INNER JOIN payment_details pd ON pd.order_id = o.id
  WHERE o.status = 'pending'
    AND pd.payment_method = 'pix'
    AND o.created_at < now() - interval '20 minutes';

  -- Se não há pedidos expirados, retornar
  IF expired_order_ids IS NULL OR array_length(expired_order_ids, 1) = 0 THEN
    RAISE LOG 'Nenhum pedido PIX expirado encontrado';
    RETURN;
  END IF;

  -- Cancelar reservas de sala PIX expiradas (20 minutos)
  UPDATE bookings
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE status = 'in_process'
    AND order_id = ANY(expired_order_ids);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Reservas de sala PIX canceladas por expiração: %', v_count;
  
  -- Cancelar reservas de equipamento PIX expiradas (20 minutos)
  UPDATE booking_equipment
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE status = 'in_process'
    AND order_id = ANY(expired_order_ids);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Reservas de equipamento PIX canceladas por expiração: %', v_count;
  
  -- Restaurar estoque de produtos para pedidos PIX expirados
  UPDATE products
  SET quantity = quantity + oi.quantity,
      updated_at = now()
  FROM order_items oi
  WHERE oi.order_id = ANY(expired_order_ids)
    AND oi.product_id = products.id;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Estoque de produtos restaurado para PIX expirado: %', v_count;
  
  -- Cancelar pedidos PIX expirados
  UPDATE orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = ANY(expired_order_ids);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Pedidos PIX cancelados por expiração: %', v_count;
END;
$function$;

-- Atualizar função clean_expired_cart_items para restaurar estoque de produtos
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
  expired_product_items RECORD;
BEGIN
  RAISE LOG 'Iniciando limpeza SUPER conservadora de itens expirados do carrinho';
  
  -- Buscar usuários que podem estar em checkout ativo (últimos 60 minutos)
  SELECT array_agg(DISTINCT user_id) INTO checkout_user_ids
  FROM orders 
  WHERE created_at > now() - interval '60 minutes'
  AND status IN ('pending', 'processing', 'in_process');
  
  -- Restaurar estoque de produtos de itens de carrinho expirados
  FOR expired_product_items IN
    SELECT ci.user_id, ci.item_id as product_id, ci.quantity
    FROM cart_items ci
    WHERE ci.expires_at < now() - interval '30 minutes' -- 30 minutos de margem
      AND ci.item_type = 'product'
      AND (checkout_user_ids IS NULL OR NOT (ci.user_id = ANY(checkout_user_ids)))
  LOOP
    BEGIN
      -- Restaurar estoque do produto
      UPDATE products
      SET quantity = quantity + expired_product_items.quantity,
          updated_at = now()
      WHERE id = expired_product_items.product_id;
      
      RAISE LOG 'Estoque restaurado para produto %: % unidades', expired_product_items.product_id, expired_product_items.quantity;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Erro ao restaurar estoque do produto %: %', expired_product_items.product_id, SQLERRM;
    END;
  END LOOP;
  
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