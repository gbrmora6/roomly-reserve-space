import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLICK2PAY_BASE_URL = "https://apisandbox.click2pay.com.br";

function createBasicAuth(clientId: string, clientSecret: string): string {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

serve(async (req) => {
  try {
    console.log("=== PAYMENT STATUS INICIADO ===");
    console.log("Method:", req.method);
    
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      throw new Error("Order ID é obrigatório");
    }

    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const clientId = Deno.env.get("CLICK2PAY_CLIENT_ID");
    const clientSecret = Deno.env.get("CLICK2PAY_CLIENT_SECRET");

    if (!supabaseUrl || !supabaseServiceKey || !clientId || !clientSecret) {
      throw new Error("Variáveis de ambiente não configuradas");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar ordem
    console.log("1. Buscando ordem:", orderId);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, payment_details(*)')
      .eq('id', orderId)
      .single();

    if (orderError) {
      throw new Error(`Erro ao buscar ordem: ${orderError.message}`);
    }

    if (!order) {
      throw new Error("Ordem não encontrada");
    }

    // Se não tem click2pay_tid, retorna apenas dados locais
    if (!order.click2pay_tid) {
      return new Response(
        JSON.stringify({
          success: true,
          orderId: order.id,
          status: order.status,
          payment_method: order.payment_method,
          total_amount: order.total_amount,
          expires_at: order.expires_at,
          payment_details: order.payment_details?.[0] || null,
          refund_status: order.refund_status,
          refund_amount: order.refund_amount,
          source: 'local'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Consultar status na Click2Pay
    console.log("2. Consultando status na Click2Pay...");
    const authHeader = createBasicAuth(clientId, clientSecret);
    
    const response = await fetch(`${CLICK2PAY_BASE_URL}/v1/transactions/${order.click2pay_tid}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    const click2payResult = await response.json();
    console.log("3. Resposta Click2Pay:", JSON.stringify(click2payResult, null, 2));

    // Atualizar status local se mudou
    if (click2payResult.success && click2payResult.data?.status !== order.status) {
      console.log("4. Atualizando status local...");
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: click2payResult.data.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error("Erro ao atualizar status:", updateError);
      }

      // Se pagamento foi confirmado, confirmar carrinho
      if (click2payResult.data.status === 'paid' && order.status !== 'paid') {
        console.log("5. Confirmando pagamento do carrinho...");
        const { error: confirmError } = await supabase
          .rpc('confirm_cart_payment', { 
            p_user_id: order.user_id, 
            p_order_id: order.id 
          });

        if (confirmError) {
          console.error("Erro ao confirmar pagamento:", confirmError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        status: click2payResult.data?.status || order.status,
        payment_method: order.payment_method,
        total_amount: order.total_amount,
        expires_at: order.expires_at,
        payment_details: order.payment_details?.[0] || null,
        refund_status: order.refund_status,
        refund_amount: order.refund_amount,
        click2pay_data: click2payResult.data || null,
        source: 'click2pay'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("=== ERRO NO PAYMENT STATUS ===");
    console.error("Mensagem:", error?.message);
    console.error("Stack:", error?.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Erro desconhecido",
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});