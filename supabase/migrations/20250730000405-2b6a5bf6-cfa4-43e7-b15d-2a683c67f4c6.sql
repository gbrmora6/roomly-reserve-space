-- Add cash payment option and improve inventory control

-- First, update add_to_cart function to check product stock
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
  v_product_quantity integer;
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
      SELECT price, quantity INTO v_price, v_product_quantity
      FROM products 
      WHERE id = p_item_id AND is_active = true;
      
      -- Verificar se há estoque suficiente para produtos
      IF v_product_quantity IS NULL THEN
        RAISE EXCEPTION 'Produto não encontrado ou inativo';
      END IF;
      
      IF v_product_quantity < p_quantity THEN
        RAISE EXCEPTION 'Estoque insuficiente. Disponível: % unidades', v_product_quantity;
      END IF;
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

  -- Inserir item no carrinho
  INSERT INTO cart_items(
    user_id, item_type, item_id, quantity, price, metadata, branch_id,
    expires_at
  ) VALUES (
    p_user_id,
    p_item_type,
    p_item_id,
    p_quantity,
    v_price,
    COALESCE(p_metadata, '{}'::jsonb),
    v_branch_id,
    now() + interval '30 minutes'
  )
  RETURNING * INTO v_cart_item;

  RAISE LOG 'Item adicionado ao carrinho: %', v_cart_item.id;

  RETURN v_cart_item;
END;
$function$;

-- Update check_availability_before_checkout to include product stock validation
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
  v_product_stock INTEGER;
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
    
    IF cart_item.cart_item_type = 'product' THEN
      -- Verificar estoque de produto
      SELECT quantity INTO v_product_stock
      FROM products
      WHERE id = cart_item.cart_item_id AND is_active = true;
      
      IF v_product_stock IS NULL THEN
        is_available := false;
        error_message := 'Produto não encontrado ou inativo';
      ELSIF v_product_stock < cart_item.quantity THEN
        is_available := false;
        error_message := format('Estoque insuficiente. Disponível: %s unidades', v_product_stock);
      END IF;
      
    ELSIF cart_item.cart_item_type IN ('room', 'equipment') AND 
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

-- Function to reduce product stock when order is confirmed
CREATE OR REPLACE FUNCTION public.reduce_product_stock(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_item RECORD;
  v_current_stock INTEGER;
BEGIN
  -- Get all product items from the order
  FOR order_item IN
    SELECT oi.product_id, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    -- Get current stock
    SELECT quantity INTO v_current_stock
    FROM products
    WHERE id = order_item.product_id;
    
    -- Check if we have enough stock
    IF v_current_stock < order_item.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para produto %', order_item.product_id;
    END IF;
    
    -- Reduce stock
    UPDATE products
    SET quantity = quantity - order_item.quantity,
        updated_at = now()
    WHERE id = order_item.product_id;
  END LOOP;
  
  RETURN true;
END;
$function$;

-- Function to restore product stock when order is cancelled
CREATE OR REPLACE FUNCTION public.restore_product_stock(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_item RECORD;
BEGIN
  -- Get all product items from the order
  FOR order_item IN
    SELECT oi.product_id, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    -- Restore stock
    UPDATE products
    SET quantity = quantity + order_item.quantity,
        updated_at = now()
    WHERE id = order_item.product_id;
  END LOOP;
  
  RETURN true;
END;
$function$;