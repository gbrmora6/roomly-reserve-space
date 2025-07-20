-- Atualizar funções do banco de dados para usar os novos status de reserva
-- Substituir 'cancelled_unpaid' por 'recused' em todas as funções

-- 1. Atualizar função get_room_availability
CREATE OR REPLACE FUNCTION public.get_room_availability(
    p_room_id uuid, 
    p_date date
)
RETURNS TABLE(
    hour text, 
    is_available boolean, 
    blocked_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    room_schedule RECORD;
    current_hour INTEGER;
    hour_time TIME;
    day_of_week INTEGER;
    weekday_name TEXT;
    start_hour INTEGER;
    end_hour INTEGER;
    booking_exists BOOLEAN;
    cart_exists BOOLEAN;
BEGIN
    -- Converter número do dia da semana para nome
    day_of_week := EXTRACT(DOW FROM p_date);
    weekday_name := CASE day_of_week
        WHEN 0 THEN 'sunday'
        WHEN 1 THEN 'monday' 
        WHEN 2 THEN 'tuesday'
        WHEN 3 THEN 'wednesday'
        WHEN 4 THEN 'thursday'
        WHEN 5 THEN 'friday'
        WHEN 6 THEN 'saturday'
    END;

    -- Buscar horário de funcionamento da sala para o dia específico
    SELECT rs.start_time, rs.end_time INTO room_schedule
    FROM room_schedules rs
    WHERE rs.room_id = p_room_id 
        AND rs.weekday = weekday_name::weekday;

    -- Se não encontrar horário para este dia, sala está fechada
    IF NOT FOUND THEN
        RAISE LOG 'Nenhum horário encontrado para sala % no dia %', p_room_id, weekday_name;
        RETURN;
    END IF;

    -- Extrair horas de início e fim
    start_hour := EXTRACT(HOUR FROM room_schedule.start_time);
    end_hour := EXTRACT(HOUR FROM room_schedule.end_time);
    
    RAISE LOG 'Sala % funciona das %:00 às %:00 em %', p_room_id, start_hour, end_hour, weekday_name;

    -- Gerar disponibilidade para cada hora (INCLUSIVE do horário de fechamento)
    current_hour := start_hour;
    WHILE current_hour <= end_hour LOOP
        hour_time := (current_hour || ':00')::TIME;
        booking_exists := FALSE;
        cart_exists := FALSE;
        
        -- Verificar se há reserva confirmada neste horário (usando novos status)
        SELECT EXISTS(
            SELECT 1 FROM bookings b
            WHERE b.room_id = p_room_id
                AND DATE(b.start_time) = p_date
                AND b.status NOT IN ('cancelled', 'recused')
                AND hour_time >= b.start_time::TIME
                AND hour_time < b.end_time::TIME
        ) INTO booking_exists;
        
        IF booking_exists THEN
            RETURN QUERY SELECT 
                (current_hour || ':00'), 
                FALSE, 
                'Reservado';
            current_hour := current_hour + 1;
            CONTINUE;
        END IF;
        
        -- Verificar se há item no carrinho (reserva temporária) neste horário
        SELECT EXISTS(
            SELECT 1 FROM cart_items ci
            JOIN bookings b ON ci.reserved_booking_id = b.id
            WHERE b.room_id = p_room_id
                AND DATE(b.start_time) = p_date
                AND b.status = 'in_process'
                AND ci.expires_at > NOW()
                AND hour_time >= b.start_time::TIME
                AND hour_time < b.end_time::TIME
        ) INTO cart_exists;
        
        IF cart_exists THEN
            RETURN QUERY SELECT 
                (current_hour || ':00'), 
                FALSE, 
                'Temporariamente reservado';
            current_hour := current_hour + 1;
            CONTINUE;
        END IF;
        
        -- Horário está disponível
        RETURN QUERY SELECT 
            (current_hour || ':00'), 
            TRUE, 
            NULL::TEXT;
        
        current_hour := current_hour + 1;
    END LOOP;
    
    RAISE LOG 'Função get_room_availability concluída para sala % em %', p_room_id, p_date;
END;
$$;

-- 2. Atualizar função add_to_cart
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
      -- Verificar disponibilidade da sala (usando novos status)
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

      -- Criar reserva pendente (usando novo status)
      INSERT INTO bookings(user_id, room_id, start_time, end_time, status, branch_id)
      VALUES (p_user_id, p_item_id, v_start_time, v_end_time, 'in_process'::booking_status, v_branch_id)
      RETURNING id INTO v_booking_id;

      -- Calcular preço baseado na duração
      v_price := v_price * EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600;

    ELSIF p_item_type = 'equipment' THEN
      -- Verificar disponibilidade do equipamento (usando novos status)
      IF EXISTS (
        SELECT 1 FROM booking_equipment be
        JOIN equipment e ON be.equipment_id = e.id
        WHERE be.equipment_id = p_item_id
        AND be.status NOT IN ('cancelled', 'recused')
        AND (
          (be.start_time <= v_start_time AND be.end_time > v_start_time)
          OR (be.start_time < v_end_time AND be.end_time >= v_end_time)
          OR (be.start_time >= v_start_time AND be.end_time <= v_end_time)
        )
        AND (
          SELECT SUM(quantity) FROM booking_equipment
          WHERE equipment_id = p_item_id
          AND status NOT IN ('cancelled', 'recused')
          AND (
            (start_time <= v_start_time AND end_time > v_start_time)
            OR (start_time < v_end_time AND end_time >= v_end_time)
            OR (start_time >= v_start_time AND end_time <= v_end_time)
          )
        ) + p_quantity > (SELECT quantity FROM equipment WHERE id = p_item_id)
      ) THEN
        RAISE EXCEPTION 'Quantidade não disponível para este equipamento no horário selecionado';
      END IF;

      -- Criar reserva de equipamento pendente (usando novo status)
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

-- Garantir que as funções tenham as permissões corretas
GRANT EXECUTE ON FUNCTION public.get_room_availability(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_availability(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION public.add_to_cart(uuid, text, uuid, integer, jsonb) TO authenticated;

-- Log para confirmar atualização
DO $$
BEGIN
    RAISE NOTICE 'Funções get_room_availability e add_to_cart atualizadas com novos status!';
END $$;