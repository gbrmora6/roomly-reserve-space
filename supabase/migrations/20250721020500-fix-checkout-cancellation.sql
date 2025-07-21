
-- Corrigir funções do carrinho para evitar cancelamento durante checkout
-- e garantir que o status seja mantido corretamente durante o processo de pagamento

-- Criar função para verificar se um item está em processo de checkout ativo
CREATE OR REPLACE FUNCTION is_checkout_in_progress(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se existe alguma order criada nos últimos 15 minutos que ainda não foi processada
  RETURN EXISTS (
    SELECT 1 FROM orders 
    WHERE user_id = p_user_id 
    AND created_at > now() - interval '15 minutes'
    AND status IN ('pending', 'processing')
  );
END;
$function$;

-- Modificar função clean_expired_cart_items para não cancelar durante checkout ativo
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
  RAISE LOG 'Iniciando limpeza de itens expirados do carrinho';
  
  -- Buscar usuários que estão em processo de checkout ativo
  SELECT array_agg(DISTINCT user_id) INTO checkout_user_ids
  FROM orders 
  WHERE created_at > now() - interval '15 minutes'
  AND status IN ('pending', 'processing');
  
  -- Primeiro, buscar IDs das reservas que serão afetadas, excluindo usuários em checkout
  BEGIN
    SELECT array_agg(reserved_booking_id) INTO expired_booking_ids
    FROM cart_items
    WHERE expires_at < now() 
      AND reserved_booking_id IS NOT NULL
      AND (checkout_user_ids IS NULL OR user_id != ALL(checkout_user_ids));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar booking IDs expirados: %', SQLERRM;
    expired_booking_ids := NULL;
  END;
  
  BEGIN
    SELECT array_agg(reserved_equipment_booking_id) INTO expired_equipment_booking_ids  
    FROM cart_items
    WHERE expires_at < now() 
      AND reserved_equipment_booking_id IS NOT NULL
      AND (checkout_user_ids IS NULL OR user_id != ALL(checkout_user_ids));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar equipment booking IDs expirados: %', SQLERRM;
    expired_equipment_booking_ids := NULL;
  END;
  
  -- Remover itens expirados do carrinho PRIMEIRO, excluindo usuários em checkout
  BEGIN
    DELETE FROM cart_items
    WHERE expires_at < now()
      AND (checkout_user_ids IS NULL OR user_id != ALL(checkout_user_ids));
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE LOG 'Cart items removidos: %', v_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao remover cart items: %', SQLERRM;
  END;
  
  -- Depois cancelar as reservas de sala se ainda existirem
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
  
  RAISE LOG 'Limpeza concluída';
END;
$function$;

-- Modificar função add_to_cart para não chamar clean_expired_cart_items durante checkout
CREATE OR REPLACE FUNCTION public.add_to_cart(p_user_id uuid, p_item_type text, p_item_id uuid, p_quantity integer DEFAULT 1, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS cart_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_price NUMERIC;
  v_cart_item cart_items;
  v_booking_id uuid;
  v_equipment_booking_id uuid;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_branch_id uuid;
  v_checkout_in_progress boolean;
BEGIN
  -- Verificar se é o próprio usuário
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autorizado';
  END IF;

  -- Verificar se há checkout em progresso
  SELECT is_checkout_in_progress(p_user_id) INTO v_checkout_in_progress;
  
  -- Limpar itens expirados antes de adicionar novo, mas só se não houver checkout em progresso
  IF NOT v_checkout_in_progress THEN
    PERFORM clean_expired_cart_items();
  END IF;

  -- Obter branch_id do usuário
  SELECT branch_id INTO v_branch_id
  FROM profiles
  WHERE id = auth.uid();

  -- Determinar preço baseado no tipo de item
  CASE p_item_type
    WHEN 'room' THEN
      SELECT price_per_hour INTO v_price 
      FROM rooms 
      WHERE id = p_item_id AND is_active = true;
    WHEN 'equipment' THEN
      SELECT price_per_hour INTO v_price 
      FROM equipment 
      WHERE id = p_item_id AND is_active = true;
    WHEN 'product' THEN
      SELECT price INTO v_price 
      FROM products 
      WHERE id = p_item_id AND is_active = true;
    ELSE
      RAISE EXCEPTION 'Tipo de item inválido: %', p_item_type;
  END CASE;

  -- Verificar se o item foi encontrado
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Item não encontrado ou inativo';
  END IF;

  -- Processar reservas para salas e equipamentos
  IF p_item_type IN ('room', 'equipment') AND p_metadata ? 'start_time' AND p_metadata ? 'end_time' THEN
    v_start_time := (p_metadata->>'start_time')::timestamptz;
    v_end_time := (p_metadata->>'end_time')::timestamptz;
    
    -- Validar horários
    IF v_start_time >= v_end_time THEN
      RAISE EXCEPTION 'Horário de início deve ser anterior ao horário de término';
    END IF;

    IF p_item_type = 'room' THEN
      -- Verificar disponibilidade da sala (usando verificação de sobreposição robusta)
      IF EXISTS (
        SELECT 1 FROM bookings
        WHERE room_id = p_item_id
        AND status NOT IN ('cancelled', 'recused')
        AND (
          (start_time <= v_start_time AND end_time > v_start_time)
          OR (start_time < v_end_time AND end_time >= v_end_time)
          OR (start_time >= v_start_time AND end_time <= v_end_time)
        )
      ) THEN
        RAISE EXCEPTION 'Horário não disponível para esta sala';
      END IF;

      -- Verificar se não há reserva temporária no carrinho
      IF EXISTS (
        SELECT 1 FROM cart_items ci
        JOIN bookings b ON ci.reserved_booking_id = b.id
        WHERE b.room_id = p_item_id
        AND b.status = 'in_process'
        AND ci.expires_at > NOW()
        AND (
          (b.start_time <= v_start_time AND b.end_time > v_start_time)
          OR (b.start_time < v_end_time AND b.end_time >= v_end_time)
          OR (b.start_time >= v_start_time AND b.end_time <= v_end_time)
        )
      ) THEN
        RAISE EXCEPTION 'Horário temporariamente reservado por outro usuário';
      END IF;

      -- Criar reserva temporária
      INSERT INTO bookings(user_id, room_id, start_time, end_time, status, branch_id)
      VALUES (p_user_id, p_item_id, v_start_time, v_end_time, 'in_process'::booking_status, v_branch_id)
      RETURNING id INTO v_booking_id;

      -- Calcular preço baseado na duração
      v_price := v_price * EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600;

    ELSIF p_item_type = 'equipment' THEN
      -- Verificar disponibilidade do equipamento
      IF EXISTS (
        SELECT 1 FROM (
          SELECT SUM(quantity) as total_reserved
          FROM booking_equipment
          WHERE equipment_id = p_item_id
          AND status NOT IN ('cancelled', 'recused')
          AND (
            (start_time <= v_start_time AND end_time > v_start_time)
            OR (start_time < v_end_time AND end_time >= v_end_time)
            OR (start_time >= v_start_time AND end_time <= v_end_time)
          )
        ) reserved
        WHERE (reserved.total_reserved + p_quantity) > (SELECT quantity FROM equipment WHERE id = p_item_id)
      ) THEN
        RAISE EXCEPTION 'Quantidade não disponível para este equipamento no horário selecionado';
      END IF;

      -- Criar reserva de equipamento temporária
      INSERT INTO booking_equipment(user_id, equipment_id, start_time, end_time, quantity, status, branch_id)
      VALUES (p_user_id, p_item_id, v_start_time, v_end_time, p_quantity, 'in_process'::booking_status, v_branch_id)
      RETURNING id INTO v_equipment_booking_id;

      -- Calcular preço baseado na duração e quantidade
      v_price := v_price * EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600 * p_quantity;
    END IF;
  END IF;

  -- Inserir item no carrinho
  INSERT INTO cart_items(
    user_id, item_type, item_id, quantity, price, metadata,
    reserved_booking_id, reserved_equipment_booking_id, expires_at, branch_id
  ) VALUES (
    p_user_id,
    p_item_type,
    p_item_id,
    p_quantity,
    v_price,
    COALESCE(p_metadata, '{}'::jsonb),
    v_booking_id,
    v_equipment_booking_id,
    CASE 
      WHEN p_item_type IN ('room', 'equipment') THEN now() + interval '15 minutes'
      ELSE NULL
    END,
    v_branch_id
  )
  RETURNING * INTO v_cart_item;

  RETURN v_cart_item;
END;
$function$;

-- Corrigir função confirm_cart_payment para garantir que atualize corretamente os status
CREATE OR REPLACE FUNCTION public.confirm_cart_payment(p_user_id uuid, p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_count INTEGER;
  v_equipment_count INTEGER;
BEGIN
  RAISE LOG 'Confirmando pagamento do carrinho para usuário: % ordem: %', p_user_id, p_order_id;
  
  -- Confirmar salas
  UPDATE bookings
  SET status = 'paid'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_booking_id FROM cart_items
     WHERE user_id = p_user_id
       AND reserved_booking_id IS NOT NULL
  )
  AND status = 'in_process';
  
  GET DIAGNOSTICS v_booking_count = ROW_COUNT;
  RAISE LOG 'Bookings confirmados: %', v_booking_count;

  -- Confirmar equipamentos
  UPDATE booking_equipment
  SET status = 'paid'::booking_status, updated_at = now()
  WHERE id IN (
    SELECT reserved_equipment_booking_id FROM cart_items
     WHERE user_id = p_user_id
       AND reserved_equipment_booking_id IS NOT NULL
  )
  AND status = 'in_process';
  
  GET DIAGNOSTICS v_equipment_count = ROW_COUNT;
  RAISE LOG 'Equipment bookings confirmados: %', v_equipment_count;

  -- Limpar carrinho
  DELETE FROM cart_items
  WHERE user_id = p_user_id;

  RAISE LOG 'Carrinho limpo para usuário: %', p_user_id;
  
  RETURN true;
END;
$function$;
