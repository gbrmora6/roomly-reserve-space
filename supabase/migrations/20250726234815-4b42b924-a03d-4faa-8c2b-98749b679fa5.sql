-- Função clear_cart corrigida para NÃO cancelar reservas durante checkout ativo
CREATE OR REPLACE FUNCTION public.clear_cart(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_has_active_checkout boolean;
  v_booking_count integer := 0;
  v_equipment_count integer := 0;
BEGIN
  -- Verificar se é o próprio usuário
  IF p_user_id != auth.uid() THEN
    RAISE LOG 'clear_cart: Acesso negado para usuário %', auth.uid();
    RETURN false;
  END IF;

  -- Verificar se há checkout ativo
  SELECT has_active_checkout(p_user_id) INTO v_has_active_checkout;
  
  RAISE LOG 'clear_cart: Usuário % tem checkout ativo: %', p_user_id, v_has_active_checkout;

  -- Se há checkout ativo, NÃO cancelar as reservas - apenas limpar o carrinho
  IF v_has_active_checkout THEN
    RAISE LOG 'clear_cart: Checkout ativo detectado - limpando carrinho sem cancelar reservas';
    
    -- Apenas remover itens do carrinho sem cancelar reservas
    DELETE FROM cart_items WHERE user_id = p_user_id;
    
    RAISE LOG 'clear_cart: Carrinho limpo sem cancelar reservas para usuário %', p_user_id;
    RETURN true;
  END IF;

  -- Se NÃO há checkout ativo, cancelar as reservas normalmente
  RAISE LOG 'clear_cart: Nenhum checkout ativo - cancelando reservas';

  -- Cancelar todas as reservas de salas do carrinho
  UPDATE bookings
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_booking_id 
    FROM cart_items
    WHERE user_id = p_user_id 
    AND reserved_booking_id IS NOT NULL
  );
  
  GET DIAGNOSTICS v_booking_count = ROW_COUNT;

  -- Cancelar todas as reservas de equipamentos do carrinho
  UPDATE booking_equipment
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_equipment_booking_id 
    FROM cart_items
    WHERE user_id = p_user_id 
    AND reserved_equipment_booking_id IS NOT NULL
  );
  
  GET DIAGNOSTICS v_equipment_count = ROW_COUNT;

  -- Remover todos os itens do carrinho do usuário
  DELETE FROM cart_items WHERE user_id = p_user_id;

  RAISE LOG 'clear_cart: % reservas de sala e % reservas de equipamento canceladas para usuário %', 
    v_booking_count, v_equipment_count, p_user_id;

  RETURN true;
END;
$function$