import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId } = await req.json();
    
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cancelando pedido PIX expirado: ${orderId}`);

    // 1. Buscar informações do pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('payment_method', 'pix')
      .single();

    if (orderError || !order) {
      console.error('Pedido não encontrado:', orderError);
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já não está cancelado
    if (order.status === 'cancelled') {
      return new Response(
        JSON.stringify({ message: 'Pedido já estava cancelado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Cancelar o pedido
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateOrderError) {
      console.error('Erro ao cancelar pedido:', updateOrderError);
      return new Response(
        JSON.stringify({ error: 'Erro ao cancelar pedido' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Cancelar reservas de sala
    const { error: cancelBookingsError } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .in('status', ['pending', 'in_process']);

    if (cancelBookingsError) {
      console.error('Erro ao cancelar reservas de sala:', cancelBookingsError);
    }

    // 4. Cancelar reservas de equipamento
    const { error: cancelEquipmentError } = await supabase
      .from('booking_equipment')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .in('status', ['pending', 'in_process']);

    if (cancelEquipmentError) {
      console.error('Erro ao cancelar reservas de equipamento:', cancelEquipmentError);
    }

    // 5. Limpar itens do carrinho se existirem
    const { error: clearCartError } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', order.user_id);

    if (clearCartError) {
      console.error('Erro ao limpar carrinho:', clearCartError);
    }

    console.log(`Pedido PIX ${orderId} cancelado com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pedido PIX cancelado por expiração',
        orderId: orderId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no cancelamento do PIX:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});