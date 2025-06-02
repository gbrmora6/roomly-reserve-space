
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
    const sellerId = Deno.env.get("CLICK2PAY_SELLER_ID") || "";
    
    // Validação do header de autenticação C2P-Hash
    const receivedHash = req.headers.get('c2p-hash');
    const expectedHash = btoa(sellerId);
    
    if (!receivedHash || receivedHash !== expectedHash) {
      console.warn("Webhook Click2Pay com hash inválido!");
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse do evento
    const evento = await req.json();
    console.log("Webhook Click2Pay recebido:", JSON.stringify(evento));

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tipoEvento = evento.type;
    const status = evento.status;
    const externalId = evento.external_identifier;
    const transacaoId = evento.tid;
    const metodo = evento.transaction_type;
    const valorPago = evento.payment?.paid_amount || evento.payment?.amount;

    if (tipoEvento === "PAYMENT_RECEIVED" && status === "paid") {
      // Pagamento confirmado - atualizar pedido
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "paid",
          paid_at: new Date().toISOString(),
          paid_amount: valorPago
        })
        .eq("external_identifier", externalId);

      if (updateError) {
        console.error("Erro ao atualizar pedido:", updateError);
        throw new Error("Falha ao atualizar status do pedido");
      }

      console.log(`Pedido ${externalId} marcado como pago via ${metodo}.`);

    } else if (tipoEvento === "PAYMENT_REFUNDED" && status === "cancelled") {
      // Pagamento cancelado/estornado
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: evento.status_reason
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
