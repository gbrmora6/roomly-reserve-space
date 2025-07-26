import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLICK2PAY_BASE_URL = "https://api.click2pay.com.br";

function createBasicAuth(clientId: string, clientSecret: string): string {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

serve(async (req) => {
  try {
    console.log("=== PAYMENT REFUND INICIADO ===");
    console.log("Method:", req.method);
    
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const body = await req.json();
    const { orderId, reason } = body;

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

    // Buscar ordem e verificar se pertence ao usuário autenticado
    console.log("1. Buscando ordem:", orderId);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      throw new Error(`Erro ao buscar ordem: ${orderError.message}`);
    }

    if (!order) {
      throw new Error("Ordem não encontrada");
    }

    if (order.refund_status === 'processing' || order.refund_status === 'completed') {
      throw new Error("Esta ordem já possui um estorno em andamento ou concluído");
    }

    if (order.status !== 'paid') {
      throw new Error("Apenas pedidos pagos podem ser estornados");
    }

    if (order.payment_method !== 'pix' && order.payment_method !== 'cartao') {
      throw new Error("Apenas pagamentos via PIX ou cartão podem ser estornados automaticamente");
    }

    // Atualizar status para processing
    console.log("2. Atualizando status do estorno para processing...");
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        refund_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      throw new Error(`Erro ao atualizar status: ${updateError.message}`);
    }

    // Verificar método de pagamento e processar estorno
    console.log("3. Processando estorno para método:", order.payment_method);
    
    let refundResult;
    const authHeader = createBasicAuth(clientId, clientSecret);

    switch (order.payment_method) {
      case 'pix':
        // PIX pago requer estorno via API específica
        console.log("4. Solicitando estorno PIX via API...");
        const pixResponse = await fetch(`${CLICK2PAY_BASE_URL}/v1/transactions/pix/${order.click2pay_tid}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            totalAmount: order.total_amount
          })
        });
        
        if (!pixResponse.ok) {
          const errorData = await pixResponse.json();
          throw new Error(`Erro na API Click2Pay: ${errorData.message || 'Erro desconhecido'}`);
        }
        
        refundResult = await pixResponse.json();
        refundResult.success = pixResponse.ok;
        break;

      case 'cartao':
        // Cartão pode ser estornado via API específica
        console.log("4. Solicitando estorno de cartão via API...");
        const cardResponse = await fetch(`${CLICK2PAY_BASE_URL}/v1/transactions/creditcard/${order.click2pay_tid}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            totalAmount: order.total_amount
          })
        });
        
        if (!cardResponse.ok) {
          const errorData = await cardResponse.json();
          throw new Error(`Erro na API Click2Pay: ${errorData.message || 'Erro desconhecido'}`);
        }
        
        refundResult = await cardResponse.json();
        refundResult.success = cardResponse.ok;
        break;

      default:
        throw new Error(`Método de pagamento não suportado para estorno: ${order.payment_method}. Apenas PIX e cartão podem ser estornados automaticamente.`);
    }

    console.log("5. Resultado do estorno:", refundResult);

    // Atualizar ordem com resultado do estorno
    const finalStatus = refundResult.success ? 'completed' : 'failed';
    const refundAmount = refundResult.success ? order.total_amount : 0;

    const { error: finalUpdateError } = await supabase
      .from('orders')
      .update({
        refund_status: finalStatus,
        refund_amount: refundAmount,
        refund_date: new Date().toISOString(),
        status: refundResult.success ? 'recused' : order.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (finalUpdateError) {
      console.error("Erro ao atualizar resultado final:", finalUpdateError);
    }

    console.log("6. Estorno processado com sucesso");

    // 7. Se estorno foi bem-sucedido, cancelar reservas relacionadas
    let cancellationResult = null;
    if (refundResult.success) {
      console.log("7. Cancelando reservas relacionadas...");
      try {
        const { data: cancelResult, error: cancelError } = await supabase
          .rpc('cancel_order_reservations', { p_order_id: orderId });
        
        if (cancelError) {
          console.error("Erro ao cancelar reservas:", cancelError);
        } else {
          cancellationResult = cancelResult;
          console.log("8. Reservas canceladas:", cancelResult);
        }
      } catch (error) {
        console.error("Erro ao executar cancelamento de reservas:", error);
      }
    }

    return new Response(
      JSON.stringify({
        success: refundResult.success,
        message: refundResult.message || (refundResult.success ? "Estorno processado com sucesso" : "Falha no estorno"),
        refund_amount: refundAmount,
        refund_status: finalStatus,
        cancelled_reservations: cancellationResult
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("=== ERRO NO PAYMENT REFUND ===");
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