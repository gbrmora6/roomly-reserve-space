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
    
    console.log("Webhook Click2Pay recebido");
    console.log("Payload:", payload);
    console.log("C2P-Hash:", c2pHash);
    
    // Verificar assinatura C2P-Hash (base64 do seller_id/client_id)
    const expectedHash = btoa(clientId);
    if (!c2pHash || c2pHash !== expectedHash) {
      console.warn("Webhook Click2Pay com hash inválido!");
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse do evento
    const evento = JSON.parse(payload);
    console.log("Evento verificado:", JSON.stringify(evento));

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tipoEvento = evento.type;
    const status = evento.status;
    const externalId = evento.external_identifier;
    const transacaoId = evento.tid;
    const metodo = evento.transaction_type;
    const valorPago = evento.payment?.paid_amount || evento.payment?.amount;

    console.log("Processando evento:", {
      tipo: tipoEvento,
      status,
      externalId,
      transacaoId,
      metodo,
      valorPago
    });

    // Mapear eventos da Click2Pay baseado na documentação
    if (tipoEvento === "PAYMENT_RECEIVED" && status === "paid") {
      // Pagamento confirmado - atualizar pedido usando o tid da Click2Pay
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "paid",
          updated_at: new Date().toISOString()
        })
        .eq("click2pay_tid", transacaoId);

      if (updateError) {
        console.error("Erro ao atualizar pedido:", updateError);
        throw new Error("Falha ao atualizar status do pedido");
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

      console.log(`Pedido com TID ${transacaoId} marcado como pago via ${metodo}.`);

    } else if (status === "cancelled" || status === "recused" || status === "expired") {
      // Pagamento cancelado/recusado/expirado
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("click2pay_tid", transacaoId);

      if (updateError) {
        console.error("Erro ao cancelar pedido:", updateError);
        throw new Error("Falha ao cancelar pedido");
      }

      console.log(`Pedido com TID ${transacaoId} cancelado/recusado/expirado.`);
      
    } else if (status === "authorized") {
      // Pagamento autorizado (cartão de crédito) - aguardando captura
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "authorized",
          updated_at: new Date().toISOString()
        })
        .eq("click2pay_tid", transacaoId);

      if (updateError) {
        console.error("Erro ao atualizar pedido:", updateError);
      }

      console.log(`Pedido com TID ${transacaoId} autorizado - aguardando captura.`);
      
    } else {
      console.log(`Evento não tratado: type=${tipoEvento}, status=${status}, tid=${transacaoId}`);
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