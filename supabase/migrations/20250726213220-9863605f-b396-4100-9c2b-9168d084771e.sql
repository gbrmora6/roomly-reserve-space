-- Criar função para cancelar reservas relacionadas a um pedido
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
  
  -- Cancelar reservas de sala relacionadas ao pedido
  -- Busca por reservas do mesmo usuário criadas próximo ao pedido (±1 hora)
  UPDATE bookings 
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE user_id = v_order.user_id
    AND branch_id = v_order.branch_id
    AND status = 'paid'
    AND created_at BETWEEN (v_order.created_at - interval '1 hour') AND (v_order.created_at + interval '1 hour');
  
  GET DIAGNOSTICS v_cancelled_bookings = ROW_COUNT;
  
  -- Cancelar reservas de equipamento relacionadas ao pedido
  UPDATE booking_equipment 
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE user_id = v_order.user_id
    AND branch_id = v_order.branch_id
    AND status = 'paid'
    AND created_at BETWEEN (v_order.created_at - interval '1 hour') AND (v_order.created_at + interval '1 hour');
  
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