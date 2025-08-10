import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: userData } = await supabaseAuth.auth.getUser(token);
    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Access denied: Only administrators can cancel cash orders' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, reason } = await req.json();
    
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cancelando pedido em dinheiro: ${orderId}`);

    // 1. Buscar informações do pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('payment_method', 'dinheiro')
      .single();

    if (orderError || !order) {
      console.error('Pedido não encontrado:', orderError);
      return new Response(
        JSON.stringify({ error: 'Pedido em dinheiro não encontrado' }),
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

    // Verificar se o pedido está pago (necessário para cancelamento)
    if (order.status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Apenas pedidos pagos podem ser cancelados' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Cancelar o pedido
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        // Store cancellation reason if provided
        payment_data: {
          ...order.payment_data,
          cancellation_reason: reason || 'Cancelado pelo administrador',
          cancelled_by_admin: userData.user.id,
          cancelled_at: new Date().toISOString()
        }
      })
      .eq('id', orderId);

    if (updateOrderError) {
      console.error('Erro ao cancelar pedido:', updateOrderError);
      return new Response(
        JSON.stringify({ error: 'Erro ao cancelar pedido' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Cancelar reservas usando a função existente
    const { data: cancellationResult, error: cancellationError } = await supabase
      .rpc('cancel_order_reservations', { p_order_id: orderId });

    if (cancellationError) {
      console.error('Erro ao cancelar reservas:', cancellationError);
    }

    // 4. Restaurar estoque de produtos se houver
    const { error: restoreStockError } = await supabase
      .rpc('restore_product_stock', { p_order_id: orderId });

    if (restoreStockError) {
      console.error('Erro ao restaurar estoque:', restoreStockError);
    }

    console.log(`Pedido em dinheiro ${orderId} cancelado com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pedido em dinheiro cancelado com sucesso',
        orderId: orderId,
        cancelled_reservations: cancellationResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no cancelamento do pedido em dinheiro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});