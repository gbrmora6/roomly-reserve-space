
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, c2p-hash",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.text();
    const c2pHash = req.headers.get('c2p-hash');
    const clientId = Deno.env.get("CLICK2PAY_CLIENT_ID") || "";
    
    console.log("=== WEBHOOK CLICK2PAY RECEBIDO ===");
    console.log("Payload:", payload);
    console.log("C2P-Hash:", c2pHash);
    
    // Verificar assinatura C2P-Hash (base64 do seller_id/client_id)
    const expectedHash = btoa(clientId);
    if (!c2pHash || c2pHash !== expectedHash) {
      console.warn("Webhook Click2Pay com hash inválido!");
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse do evento seguindo EXATAMENTE a estrutura dos exemplos fornecidos
    const evento = JSON.parse(payload);
    console.log("Evento verificado:", JSON.stringify(evento, null, 2));

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extrair campos conforme exemplos de notificação fornecidos
    const tipoEvento = evento.type;
    const status = evento.status;
    const statusReason = evento.status_reason;
    const externalId = evento.external_identifier;
    const transacaoId = evento.tid;
    const transactionType = evento.transaction_type;
    const dataEvento = evento.date;

    // Dados do cliente conforme exemplos
    const customerName = evento.customer?.name;
    const customerTaxid = evento.customer?.taxid;
    const customerEmail = evento.customer?.email;
    const customerPhone = evento.customer?.phone;

    console.log("Dados extraídos do webhook:", {
      tipo: tipoEvento,
      status,
      statusReason,
      externalId,
      transacaoId,
      transactionType,
      customerName,
      dataEvento
    });

    // Registrar o webhook recebido para auditoria
    const { error: webhookLogError } = await supabase
      .from('admin_logs')
      .insert({
        action: `webhook_${tipoEvento}`,
        details: {
          webhook_type: tipoEvento,
          status,
          status_reason: statusReason,
          tid: transacaoId,
          external_identifier: externalId,
          transaction_type: transactionType,
          customer_name: customerName,
          raw_payload: evento
        },
        branch_id: '64a43fed-587b-415c-aeac-0abfd7867566' // Branch padrão
      });

    if (webhookLogError) {
      console.error("Erro ao registrar log do webhook:", webhookLogError);
    }

    // Processar evento baseado nos exemplos de notificação fornecidos
    if (tipoEvento === "PAYMENT_RECEIVED" && status === "paid") {
      console.log("=== PROCESSANDO PAYMENT_RECEIVED ===");
      
      // Extrair dados de pagamento conforme exemplos
      const paymentData = evento.payment;
      const paidAmount = paymentData?.paid_amount || paymentData?.amount;
      const paymentDate = paymentData?.date;
      const psp = paymentData?.psp;
      const senderName = paymentData?.sender?.name;
      const endToEndId = paymentData?.endToEndId;
      const reference = paymentData?.reference;

      console.log("Dados do pagamento:", {
        paidAmount,
        paymentDate,
        psp,
        senderName,
        endToEndId,
        reference
      });

      // Atualizar ordem usando o tid da Click2Pay
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "paid",
          updated_at: new Date().toISOString(),
          click2pay_response: evento // Salvar evento completo
        })
        .eq("click2pay_tid", transacaoId);

      if (updateError) {
        console.error("Erro ao atualizar pedido:", updateError);
        throw new Error("Falha ao atualizar status do pedido");
      }

      // Atualizar payment_details com dados do webhook
      const { error: paymentUpdateError } = await supabase
        .from("payment_details")
        .update({
          updated_at: new Date().toISOString()
        })
        .eq("order_id", (await supabase
          .from("orders")
          .select("id")
          .eq("click2pay_tid", transacaoId)
          .single()).data?.id);

      if (paymentUpdateError) {
        console.error("Erro ao atualizar payment_details:", paymentUpdateError);
      }

      // Buscar a ordem para confirmar o carrinho
      const { data: order } = await supabase
        .from("orders")
        .select("id, user_id")
        .eq("click2pay_tid", transacaoId)
        .single();

      if (order) {
        const { error: confirmError } = await supabase
          .rpc("confirm_cart_payment", { 
            p_user_id: order.user_id, 
            p_order_id: order.id 
          });

        if (confirmError) {
          console.error("Erro ao confirmar carrinho:", confirmError);
        } else {
          console.log("Carrinho confirmado para usuário:", order.user_id);
        }
      }

      console.log(`Pedido com TID ${transacaoId} marcado como pago via ${transactionType}.`);

    } else if (tipoEvento === "PAYMENT_REFUNDED") {
      console.log("=== PROCESSANDO PAYMENT_REFUNDED ===");
      
      // Extrair dados de estorno conforme exemplos
      const refundData = evento.refund;
      const refundAmount = refundData?.amount;
      const refundPsp = refundData?.psp;
      const recipientName = refundData?.recipient?.name;
      const recipientTaxid = refundData?.recipient?.taxid;
      const refundEndToEndId = refundData?.endToEndId;

      console.log("Dados do estorno:", {
        refundAmount,
        refundPsp,
        recipientName,
        recipientTaxid,
        refundEndToEndId
      });

      // Atualizar ordem como cancelada/estornada
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "cancelled",
          refund_status: "refunded",
          refund_amount: parseFloat(refundAmount || "0"),
          refund_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          click2pay_response: evento
        })
        .eq("click2pay_tid", transacaoId);

      if (updateError) {
        console.error("Erro ao cancelar pedido:", updateError);
        throw new Error("Falha ao processar estorno");
      }

      console.log(`Pedido com TID ${transacaoId} estornado no valor de ${refundAmount}.`);
      
    } else if (status === "cancelled" || status === "recused" || status === "expired") {
      console.log("=== PROCESSANDO CANCELAMENTO/RECUSA/EXPIRAÇÃO ===");
      
      // Pagamento cancelado/recusado/expirado
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "recused",
          updated_at: new Date().toISOString(),
          click2pay_response: evento
        })
        .eq("click2pay_tid", transacaoId);

      if (updateError) {
        console.error("Erro ao cancelar pedido:", updateError);
        throw new Error("Falha ao cancelar pedido");
      }

      console.log(`Pedido com TID ${transacaoId} cancelado/recusado/expirado.`);
      
    } else if (status === "authorized") {
      console.log("=== PROCESSANDO AUTORIZAÇÃO ===");
      
      // Pagamento autorizado (cartão de crédito) - aguardando captura
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "pre_authorized",
          updated_at: new Date().toISOString(),
          click2pay_response: evento
        })
        .eq("click2pay_tid", transacaoId);

      if (updateError) {
        console.error("Erro ao atualizar pedido:", updateError);
      }

      console.log(`Pedido com TID ${transacaoId} autorizado - aguardando captura.`);
      
    } else {
      console.log(`Evento não tratado: type=${tipoEvento}, status=${status}, tid=${transacaoId}`);
      
      // Registrar evento não tratado para análise
      const { error: logError } = await supabase
        .from('admin_logs')
        .insert({
          action: 'webhook_unhandled',
          details: {
            webhook_type: tipoEvento,
            status,
            status_reason: statusReason,
            tid: transacaoId,
            message: `Evento não tratado: type=${tipoEvento}, status=${status}`,
            raw_payload: evento
          },
          branch_id: '64a43fed-587b-415c-aeac-0abfd7867566'
        });

      if (logError) {
        console.error("Erro ao registrar evento não tratado:", logError);
      }
    }

    return new Response("OK", { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("=== ERRO AO PROCESSAR WEBHOOK ===");
    console.error("Mensagem:", error?.message);
    console.error("Stack:", error?.stack);
    
    return new Response("Internal Server Error", { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
