-- Verificar e corrigir função clean_expired_cart_items para remover sequência correta
DROP FUNCTION IF EXISTS public.clean_expired_cart_items();

CREATE OR REPLACE FUNCTION public.clean_expired_cart_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log para debug
  RAISE LOG 'Iniciando limpeza de itens expirados do carrinho';
  
  -- Cancelar salas expiradas primeiro
  UPDATE public.bookings
  SET status = 'cancelled_unpaid'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_booking_id FROM public.cart_items
     WHERE expires_at < now()
       AND reserved_booking_id IS NOT NULL
  );
  
  -- Log quantos bookings foram cancelados
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Bookings cancelados: %', v_count;

  -- Cancelar equipamentos expirados
  UPDATE public.booking_equipment
  SET status = 'cancelled_unpaid'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_equipment_booking_id FROM public.cart_items
     WHERE expires_at < now()
       AND reserved_equipment_booking_id IS NOT NULL
  );
  
  -- Log quantos equipment bookings foram cancelados
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Equipment bookings cancelados: %', v_count;

  -- Remover itens expirados do carrinho por último
  DELETE FROM public.cart_items
  WHERE expires_at < now();
  
  -- Log quantos cart items foram removidos
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Cart items removidos: %', v_count;
  
  RAISE LOG 'Limpeza concluída';
END;
$$;

-- Adicionar declaração de variável que estava faltando
CREATE OR REPLACE FUNCTION public.clean_expired_cart_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Log para debug
  RAISE LOG 'Iniciando limpeza de itens expirados do carrinho';
  
  -- Cancelar salas expiradas primeiro
  UPDATE public.bookings
  SET status = 'cancelled_unpaid'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_booking_id FROM public.cart_items
     WHERE expires_at < now()
       AND reserved_booking_id IS NOT NULL
  );
  
  -- Log quantos bookings foram cancelados
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Bookings cancelados: %', v_count;

  -- Cancelar equipamentos expirados
  UPDATE public.booking_equipment
  SET status = 'cancelled_unpaid'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_equipment_booking_id FROM public.cart_items
     WHERE expires_at < now()
       AND reserved_equipment_booking_id IS NOT NULL
  );
  
  -- Log quantos equipment bookings foram cancelados
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Equipment bookings cancelados: %', v_count;

  -- Remover itens expirados do carrinho por último
  DELETE FROM public.cart_items
  WHERE expires_at < now();
  
  -- Log quantos cart items foram removidos
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE LOG 'Cart items removidos: %', v_count;
  
  RAISE LOG 'Limpeza concluída';
END;
$$;