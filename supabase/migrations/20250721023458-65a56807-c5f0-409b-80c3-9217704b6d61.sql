
-- Função para estender expiração do carrinho baseado no método de pagamento
CREATE OR REPLACE FUNCTION public.extend_cart_expiration(p_user_id uuid, p_payment_method text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  extension_interval interval;
BEGIN
  -- Definir extensão baseada no método de pagamento
  CASE p_payment_method
    WHEN 'pix' THEN
      extension_interval := interval '30 minutes';
    WHEN 'boleto' THEN
      extension_interval := interval '24 hours';
    WHEN 'cartao' THEN
      extension_interval := interval '5 minutes'; -- Pouco tempo extra para cartão
    ELSE
      extension_interval := interval '15 minutes'; -- Padrão
  END CASE;
  
  -- Estender expiração de todos os itens do carrinho do usuário
  UPDATE cart_items
  SET expires_at = expires_at + extension_interval,
      updated_at = now()
  WHERE user_id = p_user_id
    AND expires_at > now(); -- Só estende itens que ainda não expiraram
  
  RAISE LOG 'Expiração do carrinho estendida para usuário % com método % por %', p_user_id, p_payment_method, extension_interval;
  
  RETURN true;
END;
$function$;

-- Atualizar função clean_expired_cart_items para ser mais conservadora
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
  BEGIN
    SELECT array_agg(reserved_booking_id) INTO expired_booking_ids
    FROM cart_items
    WHERE expires_at < now() - interval '5 minutes' -- 5 minutos de margem
      AND reserved_booking_id IS NOT NULL
      AND (checkout_user_ids IS NULL OR NOT (user_id = ANY(checkout_user_ids)));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar booking IDs expirados: %', SQLERRM;
    expired_booking_ids := NULL;
  END;
  
  BEGIN
    SELECT array_agg(reserved_equipment_booking_id) INTO expired_equipment_booking_ids  
    FROM cart_items
    WHERE expires_at < now() - interval '5 minutes' -- 5 minutos de margem
      AND reserved_equipment_booking_id IS NOT NULL
      AND (checkout_user_ids IS NULL OR NOT (user_id = ANY(checkout_user_ids)));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar equipment booking IDs expirados: %', SQLERRM;
    expired_equipment_booking_ids := NULL;
  END;
  
  -- Remover apenas itens realmente expirados (com margem de segurança)
  BEGIN
    DELETE FROM cart_items
    WHERE expires_at < now() - interval '5 minutes' -- 5 minutos de margem
      AND (checkout_user_ids IS NULL OR NOT (user_id = ANY(checkout_user_ids)));
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE LOG 'Cart items removidos: %', v_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao remover cart items: %', SQLERRM;
  END;
  
  -- Cancelar reservas de sala se ainda existirem
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
  
  RAISE LOG 'Limpeza conservadora concluída';
END;
$function$;
