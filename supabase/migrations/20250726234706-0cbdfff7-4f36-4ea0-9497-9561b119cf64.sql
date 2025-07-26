-- Função auxiliar para verificar se usuário tem checkout ativo
CREATE OR REPLACE FUNCTION public.has_active_checkout(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM orders 
    WHERE user_id = p_user_id 
    AND created_at > now() - interval '60 minutes'
    AND status IN ('pending', 'processing', 'in_process')
  );
END;
$function$

---

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

---

-- Função remove_from_cart corrigida para NÃO cancelar reservas durante checkout ativo
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
  v_has_active_checkout boolean;
BEGIN
  -- Buscar dados do item do carrinho e verificar se pertence ao usuário autenticado
  SELECT reserved_booking_id, reserved_equipment_booking_id, user_id 
  INTO v_booking_id, v_equipment_booking_id, v_user_id
  FROM cart_items 
  WHERE id = p_id;

  -- Se não encontrou o item, retorna false
  IF NOT FOUND THEN
    RAISE LOG 'remove_from_cart: Item do carrinho não encontrado: %', p_id;
    RETURN false;
  END IF;

  -- Verificar se é o próprio usuário ou admin
  IF v_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE LOG 'remove_from_cart: Usuário % não autorizado a remover item %', auth.uid(), p_id;
    RETURN false;
  END IF;

  -- Verificar se há checkout ativo
  SELECT has_active_checkout(v_user_id) INTO v_has_active_checkout;
  
  RAISE LOG 'remove_from_cart: Usuário % tem checkout ativo: %', v_user_id, v_has_active_checkout;

  -- Se há checkout ativo, NÃO cancelar as reservas
  IF v_has_active_checkout THEN
    RAISE LOG 'remove_from_cart: Checkout ativo - removendo item sem cancelar reservas';
    
    -- Apenas remover item do carrinho sem cancelar reservas
    DELETE FROM cart_items WHERE id = p_id;
    
    -- Verificar se foi removido
    IF NOT FOUND THEN
      RAISE LOG 'remove_from_cart: Falha ao remover item do carrinho: %', p_id;
      RETURN false;
    END IF;

    RAISE LOG 'remove_from_cart: Item removido do carrinho sem cancelar reservas: %', p_id;
    RETURN true;
  END IF;

  -- Se NÃO há checkout ativo, cancelar as reservas normalmente
  RAISE LOG 'remove_from_cart: Nenhum checkout ativo - cancelando reservas';

  -- Cancelar reserva de sala se existir
  IF v_booking_id IS NOT NULL THEN
    UPDATE bookings 
    SET status = 'cancelled'::booking_status, updated_at = now()
    WHERE id = v_booking_id;
    RAISE LOG 'remove_from_cart: Reserva de sala cancelada: %', v_booking_id;
  END IF;

  -- Cancelar reserva de equipamento se existir
  IF v_equipment_booking_id IS NOT NULL THEN
    UPDATE booking_equipment 
    SET status = 'cancelled'::booking_status, updated_at = now()
    WHERE id = v_equipment_booking_id;
    RAISE LOG 'remove_from_cart: Reserva de equipamento cancelada: %', v_equipment_booking_id;
  END IF;

  -- Remover item do carrinho
  DELETE FROM cart_items WHERE id = p_id;

  -- Verificar se foi removido
  IF NOT FOUND THEN
    RAISE LOG 'remove_from_cart: Falha ao remover item do carrinho: %', p_id;
    RETURN false;
  END IF;

  RAISE LOG 'remove_from_cart: Item removido do carrinho com sucesso: %', p_id;
  RETURN true;
END;
$function$