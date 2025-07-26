-- Modificar função add_to_cart para não criar reservas temporárias
CREATE OR REPLACE FUNCTION public.add_to_cart(
  p_user_id uuid, 
  p_item_type text, 
  p_item_id uuid, 
  p_quantity integer DEFAULT 1, 
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS cart_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_price NUMERIC;
  v_cart_item cart_items;
  v_branch_id uuid;
  v_start_time timestamptz;
  v_end_time timestamptz;
BEGIN
  -- Verificar se é o próprio usuário
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autorizado';
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

  -- Calcular preço para salas e equipamentos baseado na duração
  IF p_item_type IN ('room', 'equipment') AND p_metadata ? 'start_time' AND p_metadata ? 'end_time' THEN
    v_start_time := (p_metadata->>'start_time')::timestamptz;
    v_end_time := (p_metadata->>'end_time')::timestamptz;
    
    -- Validar horários
    IF v_start_time >= v_end_time THEN
      RAISE EXCEPTION 'Horário de início deve ser anterior ao horário de término';
    END IF;

    -- Calcular preço baseado na duração e quantidade (para equipamentos)
    IF p_item_type = 'equipment' THEN
      v_price := v_price * EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600 * p_quantity;
    ELSE
      v_price := v_price * EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 3600;
    END IF;
  END IF;

  -- Inserir item no carrinho SEM criar reservas temporárias
  INSERT INTO cart_items(
    user_id, item_type, item_id, quantity, price, metadata, branch_id
  ) VALUES (
    p_user_id,
    p_item_type,
    p_item_id,
    p_quantity,
    v_price,
    COALESCE(p_metadata, '{}'::jsonb),
    v_branch_id
  )
  RETURNING * INTO v_cart_item;

  RETURN v_cart_item;
END;
$function$;

-- Criar função para verificar disponibilidade antes do checkout
CREATE OR REPLACE FUNCTION public.check_availability_before_checkout(p_user_id uuid)
RETURNS TABLE(
  item_id uuid,
  item_type text,
  is_available boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cart_item RECORD;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_conflicts_count INTEGER;
  v_total_reserved INTEGER;
  v_available_quantity INTEGER;
BEGIN
  -- Verificar cada item do carrinho
  FOR cart_item IN 
    SELECT ci.*, ci.item_id as cart_item_id, ci.item_type as cart_item_type
    FROM cart_items ci 
    WHERE ci.user_id = p_user_id
  LOOP
    -- Inicializar como disponível
    item_id := cart_item.cart_item_id;
    item_type := cart_item.cart_item_type;
    is_available := true;
    error_message := null;
    
    -- Verificar apenas para salas e equipamentos
    IF cart_item.cart_item_type IN ('room', 'equipment') AND 
       cart_item.metadata ? 'start_time' AND 
       cart_item.metadata ? 'end_time' THEN
       
      v_start_time := (cart_item.metadata->>'start_time')::timestamptz;
      v_end_time := (cart_item.metadata->>'end_time')::timestamptz;
      
      IF cart_item.cart_item_type = 'room' THEN
        -- Verificar conflitos de sala
        SELECT COUNT(*) INTO v_conflicts_count
        FROM bookings b
        WHERE b.room_id = cart_item.cart_item_id
        AND b.status IN ('paid', 'in_process')
        AND (
          (b.start_time <= v_start_time AND b.end_time > v_start_time)
          OR (b.start_time < v_end_time AND b.end_time >= v_end_time)
          OR (b.start_time >= v_start_time AND b.end_time <= v_end_time)
        );
        
        IF v_conflicts_count > 0 THEN
          is_available := false;
          error_message := 'Sala não está mais disponível no horário selecionado';
        END IF;
        
      ELSIF cart_item.cart_item_type = 'equipment' THEN
        -- Verificar conflitos de equipamento
        SELECT COALESCE(SUM(be.quantity), 0) INTO v_total_reserved
        FROM booking_equipment be
        WHERE be.equipment_id = cart_item.cart_item_id
        AND be.status IN ('paid', 'in_process')
        AND (
          (be.start_time <= v_start_time AND be.end_time > v_start_time)
          OR (be.start_time < v_end_time AND be.end_time >= v_end_time)
          OR (be.start_time >= v_start_time AND be.end_time <= v_end_time)
        );
        
        -- Obter quantidade total disponível do equipamento
        SELECT quantity INTO v_available_quantity
        FROM equipment
        WHERE id = cart_item.cart_item_id;
        
        IF (v_total_reserved + cart_item.quantity) > v_available_quantity THEN
          is_available := false;
          error_message := 'Quantidade de equipamento não está mais disponível no horário selecionado';
        END IF;
      END IF;
    END IF;
    
    RETURN NEXT;
  END LOOP;
END;
$function$;

-- Criar função para verificar e criar reservas no momento do checkout
CREATE OR REPLACE FUNCTION public.create_reservations_for_checkout(p_user_id uuid)
RETURNS TABLE(
  success boolean,
  room_booking_ids uuid[],
  equipment_booking_ids uuid[],
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cart_item RECORD;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_branch_id uuid;
  v_booking_id uuid;
  v_equipment_booking_id uuid;
  v_room_ids uuid[] := '{}';
  v_equipment_ids uuid[] := '{}';
  v_conflicts_count INTEGER;
  v_total_reserved INTEGER;
  v_available_quantity INTEGER;
BEGIN
  -- Obter branch_id do usuário
  SELECT branch_id INTO v_branch_id
  FROM profiles
  WHERE id = p_user_id;
  
  -- Verificar disponibilidade antes de criar reservas
  FOR cart_item IN 
    SELECT * FROM cart_items WHERE user_id = p_user_id
  LOOP
    IF cart_item.item_type IN ('room', 'equipment') AND 
       cart_item.metadata ? 'start_time' AND 
       cart_item.metadata ? 'end_time' THEN
       
      v_start_time := (cart_item.metadata->>'start_time')::timestamptz;
      v_end_time := (cart_item.metadata->>'end_time')::timestamptz;
      
      IF cart_item.item_type = 'room' THEN
        -- Verificar conflitos de sala
        SELECT COUNT(*) INTO v_conflicts_count
        FROM bookings b
        WHERE b.room_id = cart_item.item_id
        AND b.status IN ('paid', 'in_process')
        AND (
          (b.start_time <= v_start_time AND b.end_time > v_start_time)
          OR (b.start_time < v_end_time AND b.end_time >= v_end_time)
          OR (b.start_time >= v_start_time AND b.end_time <= v_end_time)
        );
        
        IF v_conflicts_count > 0 THEN
          success := false;
          error_message := 'Sala não está mais disponível. Outro usuário fez a reserva antes de você.';
          RETURN NEXT;
          RETURN;
        END IF;
        
      ELSIF cart_item.item_type = 'equipment' THEN
        -- Verificar conflitos de equipamento
        SELECT COALESCE(SUM(be.quantity), 0) INTO v_total_reserved
        FROM booking_equipment be
        WHERE be.equipment_id = cart_item.item_id
        AND be.status IN ('paid', 'in_process')
        AND (
          (be.start_time <= v_start_time AND be.end_time > v_start_time)
          OR (be.start_time < v_end_time AND be.end_time >= v_end_time)
          OR (be.start_time >= v_start_time AND be.end_time <= v_end_time)
        );
        
        SELECT quantity INTO v_available_quantity
        FROM equipment
        WHERE id = cart_item.item_id;
        
        IF (v_total_reserved + cart_item.quantity) > v_available_quantity THEN
          success := false;
          error_message := 'Equipamento não está mais disponível na quantidade solicitada. Outro usuário fez a reserva antes de você.';
          RETURN NEXT;
          RETURN;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  -- Se chegou até aqui, todos os itens estão disponíveis - criar reservas
  FOR cart_item IN 
    SELECT * FROM cart_items WHERE user_id = p_user_id
  LOOP
    IF cart_item.item_type = 'room' AND 
       cart_item.metadata ? 'start_time' AND 
       cart_item.metadata ? 'end_time' THEN
       
      v_start_time := (cart_item.metadata->>'start_time')::timestamptz;
      v_end_time := (cart_item.metadata->>'end_time')::timestamptz;
      
      INSERT INTO bookings(user_id, room_id, start_time, end_time, status, branch_id)
      VALUES (p_user_id, cart_item.item_id, v_start_time, v_end_time, 'in_process'::booking_status, v_branch_id)
      RETURNING id INTO v_booking_id;
      
      v_room_ids := array_append(v_room_ids, v_booking_id);
      
    ELSIF cart_item.item_type = 'equipment' AND 
          cart_item.metadata ? 'start_time' AND 
          cart_item.metadata ? 'end_time' THEN
          
      v_start_time := (cart_item.metadata->>'start_time')::timestamptz;
      v_end_time := (cart_item.metadata->>'end_time')::timestamptz;
      
      INSERT INTO booking_equipment(user_id, equipment_id, start_time, end_time, quantity, status, branch_id)
      VALUES (p_user_id, cart_item.item_id, v_start_time, v_end_time, cart_item.quantity, 'in_process'::booking_status, v_branch_id)
      RETURNING id INTO v_equipment_booking_id;
      
      v_equipment_ids := array_append(v_equipment_ids, v_equipment_booking_id);
    END IF;
  END LOOP;
  
  success := true;
  room_booking_ids := v_room_ids;
  equipment_booking_ids := v_equipment_ids;
  error_message := null;
  
  RETURN NEXT;
END;
$function$;