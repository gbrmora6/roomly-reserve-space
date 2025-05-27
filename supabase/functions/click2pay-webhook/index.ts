
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

/**
 * Headers CORS para permitir requisições do Click2Pay
 * Inclui header personalizado 'c2p-hash' usado para autenticação do webhook
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, c2p-hash",
};

/**
 * WEBHOOK CLICK2PAY
 * 
 * Esta função recebe notificações automáticas do Click2Pay quando o status
 * de um pagamento é alterado (aprovado, rejeitado, estornado, etc.)
 * 
 * Fluxo de funcionamento:
 * 1. Click2Pay envia POST com dados do evento de pagamento
 * 2. Função valida autenticidade usando hash de segurança
 * 3. Processa evento e atualiza status do pedido no banco
 * 4. Retorna confirmação para Click2Pay
 * 
 * Eventos processados:
 * - PAYMENT_RECEIVED + status "paid" = Pagamento confirmado
 * - PAYMENT_REFUNDED + status "cancelled" = Pagamento estornado
 */
serve(async (req) => {
  // Resposta para requisições OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ID do vendedor usado para validação de segurança
    // Deve coincidir com o configurado no painel Click2Pay
    const sellerId = Deno.env.get("CLICK2PAY_SELLER_ID") || "";
    
    /**
     * VALIDAÇÃO DE SEGURANÇA DO WEBHOOK
     * 
     * O Click2Pay envia um header 'c2p-hash' contendo o seller_id codificado em base64
     * Isso garante que a requisição realmente vem do Click2Pay e não de terceiros
     */
    const receivedHash = req.headers.get('c2p-hash');
    const expectedHash = btoa(sellerId); // Codificar seller_id em base64
    
    // Verificar se hash está presente e é válido
    if (!receivedHash || receivedHash !== expectedHash) {
      console.warn("Webhook Click2Pay com hash inválido!");
      return new Response("Unauthorized", { status: 401 });
    }

    // Extrair dados do evento enviado pelo Click2Pay
    const evento = await req.json();
    console.log("Webhook Click2Pay recebido:", JSON.stringify(evento));

    // Inicializar cliente Supabase para operações no banco de dados
    // Usa service role key para ter permissões administrativas
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    /**
     * EXTRAÇÃO DOS DADOS DO EVENTO
     * 
     * Estrutura típica do evento Click2Pay:
     * {
     *   type: "PAYMENT_RECEIVED" | "PAYMENT_REFUNDED" | ...,
     *   status: "paid" | "cancelled" | "pending" | ...,
     *   external_identifier: "order_123", // ID do pedido no nosso sistema
     *   tid: "click2pay_transaction_id",
     *   transaction_type: "pix" | "credit_card" | "boleto",
     *   payment: { amount: 1050, paid_amount: 1050 }
     * }
     */
    const tipoEvento = evento.type;
    const status = evento.status;
    const externalId = evento.external_identifier; // ID do pedido em nosso sistema
    const transacaoId = evento.tid; // ID da transação no Click2Pay
    const metodo = evento.transaction_type; // Método de pagamento usado
    const valorPago = evento.payment?.paid_amount || evento.payment?.amount;

    /**
     * PROCESSAMENTO DE PAGAMENTO CONFIRMADO
     * 
     * Quando Click2Pay confirma que pagamento foi aprovado e processado
     * Atualiza status do pedido para "paid" e registra informações do pagamento
     */
    if (tipoEvento === "PAYMENT_RECEIVED" && status === "paid") {
      // Atualizar pedido no banco de dados
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "paid", // Marcar como pago
          paid_at: new Date().toISOString(), // Timestamp do pagamento
          paid_amount: valorPago // Valor efetivamente pago
        })
        .eq("external_identifier", externalId); // Buscar pelo ID do pedido

      // Verificar se atualização foi bem-sucedida
      if (updateError) {
        console.error("Erro ao atualizar pedido:", updateError);
        throw new Error("Falha ao atualizar status do pedido");
      }

      console.log(`Pedido ${externalId} marcado como pago via ${metodo}.`);

    /**
     * PROCESSAMENTO DE PAGAMENTO CANCELADO/ESTORNADO
     * 
     * Quando Click2Pay informa que pagamento foi cancelado ou estornado
     * Atualiza status do pedido para "cancelled" e registra motivo
     */
    } else if (tipoEvento === "PAYMENT_REFUNDED" && status === "cancelled") {
      // Atualizar pedido como cancelado
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "cancelled", // Marcar como cancelado
          cancelled_at: new Date().toISOString(), // Timestamp do cancelamento
          cancellation_reason: evento.status_reason // Motivo do cancelamento
        })
        .eq("external_identifier", externalId);

      // Verificar se atualização foi bem-sucedida
      if (updateError) {
        console.error("Erro ao cancelar pedido:", updateError);
        throw new Error("Falha ao cancelar pedido");
      }

      console.log(`Pedido ${externalId} cancelado/estornado.`);
    } else {
      // Log de eventos não tratados para monitoramento
      console.log(`Evento não tratado: type=${tipoEvento}, status=${status}.`);
    }

    // Retornar confirmação para Click2Pay
    // É importante retornar 200 OK para confirmar recebimento do webhook
    return new Response("OK", { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    // Log e tratamento de erros
    console.error("Erro ao processar webhook:", error);
    return new Response("Internal Server Error", { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
