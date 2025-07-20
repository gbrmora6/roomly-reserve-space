
-- Limpar funções duplicadas e problemáticas no banco de dados

-- 1. Remover funções duplicadas/obsoletas que referenciam tabelas inexistentes
DROP FUNCTION IF EXISTS public.get_room_availability(uuid, timestamp with time zone, timestamp with time zone, uuid);
DROP FUNCTION IF EXISTS public.get_equipment_availability(uuid, timestamp with time zone, timestamp with time zone, integer, uuid);

-- 2. Manter apenas a versão correta de add_to_cart
DROP FUNCTION IF EXISTS public.add_to_cart(uuid, text, uuid, integer, numeric, jsonb, uuid);

-- 3. Corrigir a função clean_expired_cart_items para usar status corretos
CREATE OR REPLACE FUNCTION public.clean_expired_cart_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
  expired_booking_ids uuid[];
  expired_equipment_booking_ids uuid[];
BEGIN
  RAISE LOG 'Iniciando limpeza de itens expirados do carrinho';
  
  -- Primeiro, buscar IDs das reservas que serão afetadas
  BEGIN
    SELECT array_agg(reserved_booking_id) INTO expired_booking_ids
    FROM cart_items
    WHERE expires_at < now() 
      AND reserved_booking_id IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar booking IDs expirados: %', SQLERRM;
    expired_booking_ids := NULL;
  END;
  
  BEGIN
    SELECT array_agg(reserved_equipment_booking_id) INTO expired_equipment_booking_ids  
    FROM cart_items
    WHERE expires_at < now() 
      AND reserved_equipment_booking_id IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar equipment booking IDs expirados: %', SQLERRM;
    expired_equipment_booking_ids := NULL;
  END;
  
  -- Remover itens expirados do carrinho PRIMEIRO
  BEGIN
    DELETE FROM cart_items
    WHERE expires_at < now();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE LOG 'Cart items removidos: %', v_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao remover cart items: %', SQLERRM;
  END;
  
  -- Depois cancelar as reservas de sala se ainda existirem
  IF expired_booking_ids IS NOT NULL AND array_length(expired_booking_ids, 1) > 0 THEN
    BEGIN
      UPDATE bookings
      SET status = 'recused'::booking_status, updated_at = now()
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
      SET status = 'recused'::booking_status, updated_at = now()
      WHERE id = ANY(expired_equipment_booking_ids) AND status = 'in_process';
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE LOG 'Equipment bookings cancelados: %', v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Erro ao cancelar equipment bookings: %', SQLERRM;
    END;
  END IF;
  
  RAISE LOG 'Limpeza concluída';
END;
$$;

-- 4. Garantir que temos apenas uma versão funcional do clear_cart
CREATE OR REPLACE FUNCTION public.clear_cart(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se é o próprio usuário
  IF p_user_id != auth.uid() THEN
    RETURN false;
  END IF;

  -- Cancelar todas as reservas de salas do carrinho
  UPDATE bookings
  SET status = 'recused'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_booking_id 
    FROM cart_items
    WHERE user_id = p_user_id 
    AND reserved_booking_id IS NOT NULL
  );

  -- Cancelar todas as reservas de equipamentos do carrinho
  UPDATE booking_equipment
  SET status = 'recused'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_equipment_booking_id 
    FROM cart_items
    WHERE user_id = p_user_id 
    AND reserved_equipment_booking_id IS NOT NULL
  );

  -- Remover todos os itens do carrinho do usuário
  DELETE FROM cart_items
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;

-- 5. Corrigir função confirm_cart_payment para usar status corretos
CREATE OR REPLACE FUNCTION public.confirm_cart_payment(p_user_id uuid, p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Confirmar salas
  UPDATE bookings
  SET status = 'confirmed'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_booking_id FROM cart_items
     WHERE user_id = p_user_id
       AND reserved_booking_id IS NOT NULL
  );

  -- Confirmar equipamentos
  UPDATE booking_equipment
  SET status = 'confirmed'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_equipment_booking_id FROM cart_items
     WHERE user_id = p_user_id
       AND reserved_equipment_booking_id IS NOT NULL
  );

  -- Limpar carrinho
  DELETE FROM cart_items
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;
