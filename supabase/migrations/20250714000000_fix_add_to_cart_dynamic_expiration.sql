-- Atualizar função add_to_cart para usar configurações dinâmicas de expiração
CREATE OR REPLACE FUNCTION public.add_to_cart(p_user_id uuid, p_item_type text, p_item_id uuid, p_quantity integer, p_metadata jsonb)
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
  v_expiration_interval interval;
BEGIN
  -- Verificar se é o próprio usuário
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autorizado';
  END IF;

  -- Limpar itens expirados antes de adicionar novo
  PERFORM clean_expired_cart_items();

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
      -- Verificar disponibilidade da sala
      IF EXISTS (
        SELECT 1 FROM bookings
        WHERE room_id = p_item_id
        AND status NOT IN ('cancelled', 'cancelled_unpaid')
        AND (
          (start_time <= v_start_time AND end_time > v_start_time)
          OR (start_time < v_end_time AND end_time >= v_end_time)
          OR (start_time >= v_start_time AND end_time <= v_end_time)
        )
      ) THEN
        RAISE EXCEPTION 'Horário não disponível para esta sala';
      END IF;

      -- Criar reserva pendente
      INSERT INTO bookings(user_id, room_id, start_time, end_time, status, branch_id)
      VALUES (p_user_id, p_item_id, v_start_time, v_end_time, 'pending'::booking_status, v_branch_id)
      RETURNING id INTO v_booking_id;

      -- Calcular preço baseado na duração
      v_price := v_price * EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600;

    ELSIF p_item_type = 'equipment' THEN
      -- Verificar disponibilidade do equipamento
      IF EXISTS (
        SELECT 1 FROM booking_equipment be
        JOIN equipment e ON be.equipment_id = e.id
        WHERE be.equipment_id = p_item_id
        AND be.status NOT IN ('cancelled', 'cancelled_unpaid')
        AND (
          (be.start_time <= v_start_time AND be.end_time > v_start_time)
          OR (be.start_time < v_end_time AND be.end_time >= v_end_time)
          OR (be.start_time >= v_start_time AND be.end_time <= v_end_time)
        )
        AND (
          SELECT SUM(quantity) FROM booking_equipment
          WHERE equipment_id = p_item_id
          AND status NOT IN ('cancelled', 'cancelled_unpaid')
          AND (
            (start_time <= v_start_time AND end_time > v_start_time)
            OR (start_time < v_end_time AND end_time >= v_end_time)
            OR (start_time >= v_start_time AND end_time <= v_end_time)
          )
        ) + p_quantity > (SELECT quantity FROM equipment WHERE id = p_item_id)
      ) THEN
        RAISE EXCEPTION 'Quantidade não disponível para este equipamento no horário selecionado';
      END IF;

      -- Criar reserva de equipamento pendente
      INSERT INTO booking_equipment(user_id, equipment_id, start_time, end_time, quantity, status, branch_id)
      VALUES (p_user_id, p_item_id, v_start_time, v_end_time, p_quantity, 'pending'::booking_status, v_branch_id)
      RETURNING id INTO v_equipment_booking_id;

      -- Calcular preço baseado na duração e quantidade
      v_price := v_price * EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600 * p_quantity;
    END IF;
  END IF;

  -- Obter tempo de expiração baseado no tipo de item e configurações
  IF p_item_type = 'room' THEN
    SELECT COALESCE(setting_value::text, '"15 minutes"')::text::interval INTO v_expiration_interval
    FROM system_settings 
    WHERE setting_key = 'cart_expiration_room';
  ELSIF p_item_type = 'equipment' THEN
    SELECT COALESCE(setting_value::text, '"15 minutes"')::text::interval INTO v_expiration_interval
    FROM system_settings 
    WHERE setting_key = 'cart_expiration_equipment';
  ELSE
    -- Para produtos, usar 15 minutos como padrão
    v_expiration_interval := '15 minutes'::interval;
  END IF;
  
  -- Se não encontrou configuração, usar padrão
  IF v_expiration_interval IS NULL THEN
    v_expiration_interval := '15 minutes'::interval;
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
      WHEN p_item_type IN ('room', 'equipment') THEN now() + v_expiration_interval
      ELSE NULL
    END,
    v_branch_id
  )
  RETURNING * INTO v_cart_item;

  RETURN v_cart_item;
END;
$function$;

-- Comentário para confirmar que a migração foi aplicada
-- Função add_to_cart atualizada para usar configurações dinâmicas de expiração