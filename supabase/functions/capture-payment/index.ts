import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLICK2PAY_BASE_URL = "https://api.click2pay.com.br";

function createBasicAuth(clientId: string, clientSecret: string): string {
  const credentials = `${clientId}:${clientSecret}`;
  return `Basic ${btoa(credentials)}`;
}

async function capturePayment(tid: string, totalAmount: number, clientId: string, clientSecret: string): Promise<any> {
  console.log(`Iniciando captura para TID: ${tid}, valor: ${totalAmount}`);
  
  const captureData = {
    totalAmount: totalAmount
  };
  
  try {
    const response = await fetch(`${CLICK2PAY_BASE_URL}/v1/transactions/creditcard/${tid}/capture`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': createBasicAuth(clientId, clientSecret)
      },
      body: JSON.stringify(captureData)
    });

    const responseText = await response.text();
    console.log("Resposta da captura (raw):", responseText);

    if (!response.ok) {
      console.error("Erro na captura - Status:", response.status);
      return { success: false, error: `Erro HTTP ${response.status}: ${responseText}` };
    }

    const result = JSON.parse(responseText);
    console.log("Resposta da captura (parsed):", JSON.stringify(result, null, 2));
    
    return { success: true, data: result };
  } catch (error) {
    console.error("Erro na captura:", error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { orderId } = await req.json();
    
    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, message: "ID da ordem é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get order details
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
      console.error("Erro ao buscar ordem:", orderError);
      return new Response(
        JSON.stringify({ success: false, message: "Ordem não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify order status
    if (orderData.status !== "authorized") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Ordem deve estar com status 'authorized' para captura. Status atual: ${orderData.status}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify payment method
    if (orderData.payment_method !== "cartao") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Captura só é possível para cartão de crédito. Método atual: ${orderData.payment_method}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Click2Pay credentials
    const clientId = Deno.env.get("CLICK2PAY_CLIENT_ID");
    const clientSecret = Deno.env.get("CLICK2PAY_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("Credenciais Click2Pay não configuradas");
      return new Response(
        JSON.stringify({ success: false, message: "Configuração de pagamento incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify TID exists
    if (!orderData.click2pay_tid) {
      return new Response(
        JSON.stringify({ success: false, message: "TID não encontrado na ordem" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Perform capture
    console.log(`Capturando pagamento para ordem ${orderId}, TID: ${orderData.click2pay_tid}`);
    const captureResult = await capturePayment(
      orderData.click2pay_tid,
      orderData.total_amount,
      clientId,
      clientSecret
    );

    if (!captureResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Erro na captura: ${captureResult.error}` 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order status to captured/paid
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        status: "paid",
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Erro ao atualizar ordem:", updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Captura realizada mas erro ao atualizar ordem" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Confirm cart payment
    const { error: confirmError } = await supabase.rpc("confirm_cart_payment", {
      p_user_id: orderData.user_id,
      p_order_id: orderData.id
    });

    if (confirmError) {
      console.error("Erro ao confirmar carrinho:", confirmError);
      // Don't return error here, capture was successful
    }

    console.log(`Captura realizada com sucesso para ordem ${orderId}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Pagamento capturado com sucesso",
        data: captureResult.data
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na função capture-payment:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Erro interno do servidor" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});