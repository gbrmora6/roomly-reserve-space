import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
};

// Função para verificar assinatura HMAC
async function verifyHmacSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return computedSignature === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.text();
    const signature = req.headers.get('x-signature');
    const clientSecret = Deno.env.get("CLICK2PAY_CLIENT_SECRET") || "";
    
    console.log("Webhook Click2Pay recebido");
    console.log("Payload:", payload);
    console.log("Signature:", signature);
    
    // Verificar assinatura HMAC
    if (!signature || !await verifyHmacSignature(payload, signature, clientSecret)) {
      console.warn("Webhook Click2Pay com assinatura inválida!");
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse do evento
    const evento = JSON.parse(payload);
    console.log("Evento verificado:", JSON.stringify(evento));

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tipoEvento = evento.type || evento.eventType;
    const status = evento.status;
    const externalId = evento.external_identifier || evento.merchantTransactionId;
    const transacaoId = evento.tid || evento.id;
    const valorPago = evento.payment?.paid_amount || evento.payment?.amount || evento.amount;

    console.log("Processando evento:", {
      tipo: tipoEvento,
      status,
      externalId,
      transacaoId,
      valorPago
    });

    // Mapear eventos da Click2Pay
    if (tipoEvento === "PAYMENT_RECEIVED" || tipoEvento === "PAYMENT-COMPLETED" || status === "paid") {
      // Pagamento confirmado - atualizar pedido
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "paid",
          updated_at: new Date().toISOString()
        })
        .eq("external_identifier", externalId);

      if (updateError) {
        console.error("Erro ao atualizar pedido:", updateError);
        throw new Error("Falha ao atualizar status do pedido");
      }

      // Confirmar carrinho (confirmar reservas de salas e equipamentos)
      const { data: order } = await supabase
        .from("orders")
        .select("user_id")
        .eq("external_identifier", externalId)
        .single();

      if (order) {
        const { error: confirmError } = await supabase
          .rpc("confirm_cart_payment", { 
            p_user_id: order.user_id, 
            p_order_id: externalId 
          });

        if (confirmError) {
          console.error("Erro ao confirmar carrinho:", confirmError);
        } else {
          console.log("Carrinho confirmado para usuário:", order.user_id);
        }
      }

      console.log(`Pedido ${externalId} marcado como pago.`);

    } else if (tipoEvento === "PAYMENT_REFUNDED" || tipoEvento === "PAYMENT_FAILED" || status === "cancelled" || status === "failed") {
      // Pagamento cancelado/estornado/falhado
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("external_identifier", externalId);

      if (updateError) {
        console.error("Erro ao cancelar pedido:", updateError);
        throw new Error("Falha ao cancelar pedido");
      }

      console.log(`Pedido ${externalId} cancelado/estornado.`);
    } else {
      console.log(`Evento não tratado: type=${tipoEvento}, status=${status}.`);
    }

    return new Response("OK", { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    return new Response("Internal Server Error", { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});