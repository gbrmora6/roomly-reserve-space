-- Adicionar order_id nas tabelas de bookings para melhorar o mapeamento
-- Isso elimina a dependência de timestamps imprecisos

-- Adicionar order_id na tabela bookings
ALTER TABLE public.bookings 
ADD COLUMN order_id UUID REFERENCES public.orders(id);

-- Adicionar order_id na tabela booking_equipment  
ALTER TABLE public.booking_equipment 
ADD COLUMN order_id UUID REFERENCES public.orders(id);

-- Criar índices para melhorar performance das consultas
CREATE INDEX idx_bookings_order_id ON public.bookings(order_id);
CREATE INDEX idx_booking_equipment_order_id ON public.booking_equipment(order_id);

-- Melhorar a função cancel_order_reservations para usar order_id direto
CREATE OR REPLACE FUNCTION public.cancel_order_reservations(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order orders%ROWTYPE;
  v_cancelled_bookings INTEGER := 0;
  v_cancelled_equipment INTEGER := 0;
  v_result jsonb;
BEGIN
  -- Buscar informações do pedido
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Pedido não encontrado'
    );
  END IF;
  
  -- Cancelar reservas de sala usando order_id diretamente quando possível
  -- Fallback para busca por timestamp se order_id não estiver definido
  UPDATE bookings 
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE (
    (order_id = p_order_id) OR
    (order_id IS NULL AND 
     user_id = v_order.user_id AND
     branch_id = v_order.branch_id AND
     status = 'paid' AND
     created_at BETWEEN (v_order.created_at - interval '1 hour') AND (v_order.created_at + interval '1 hour'))
  );
  
  GET DIAGNOSTICS v_cancelled_bookings = ROW_COUNT;
  
  -- Cancelar reservas de equipamento usando order_id diretamente quando possível
  -- Fallback para busca por timestamp se order_id não estiver definido  
  UPDATE booking_equipment 
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE (
    (order_id = p_order_id) OR
    (order_id IS NULL AND 
     user_id = v_order.user_id AND
     branch_id = v_order.branch_id AND
     status = 'paid' AND
     created_at BETWEEN (v_order.created_at - interval '1 hour') AND (v_order.created_at + interval '1 hour'))
  );
  
  GET DIAGNOSTICS v_cancelled_equipment = ROW_COUNT;
  
  -- Log da ação
  PERFORM log_security_event(
    'order_refund',
    'cancel_reservations',
    jsonb_build_object(
      'order_id', p_order_id,
      'cancelled_bookings', v_cancelled_bookings,
      'cancelled_equipment', v_cancelled_equipment,
      'user_id', v_order.user_id
    ),
    'warning',
    'orders',
    p_order_id,
    40
  );
  
  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'cancelled_bookings', v_cancelled_bookings,
    'cancelled_equipment', v_cancelled_equipment,
    'message', format('Canceladas %s reservas de sala e %s reservas de equipamento', v_cancelled_bookings, v_cancelled_equipment)
  );
  
  RETURN v_result;
END;
$function$;

-- Melhorar a função confirm_cart_payment para definir order_id nas reservas
CREATE OR REPLACE FUNCTION public.confirm_cart_payment(p_user_id uuid, p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Confirmar salas e definir order_id
  UPDATE bookings
  SET status = 'paid'::booking_status, 
      updated_at = now(),
      order_id = p_order_id
  WHERE id IN (
    SELECT reserved_booking_id FROM cart_items
     WHERE user_id = p_user_id
       AND reserved_booking_id IS NOT NULL
  );

  -- Confirmar equipamentos e definir order_id
  UPDATE booking_equipment
  SET status = 'paid'::booking_status, 
      updated_at = now(),
      order_id = p_order_id
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
$function$;