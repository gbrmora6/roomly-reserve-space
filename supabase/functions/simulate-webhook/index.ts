import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    
    console.log("=== SIMULANDO WEBHOOK PARA ORDEM ===");
    console.log("Order ID:", orderId);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Buscar a ordem
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
      
    if (orderError) {
      throw new Error(`Ordem não encontrada: ${orderError.message}`);
    }
    
    // Extrair TID da resposta Click2Pay
    const tid = order.click2pay_response?.data?.tid;
    if (!tid) {
      throw new Error("TID não encontrado na resposta Click2Pay");
    }
    
    console.log("TID encontrado:", tid);
    
    // Atualizar ordem com TID
    await supabase
      .from("orders")
      .update({ 
        click2pay_tid: tid,
        external_identifier: order.click2pay_response?.data?.externalIdentifier || tid,
        status: "paid",
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);
      
    console.log("Ordem atualizada com TID e status pago");
    
    // Confirmar carrinho
    const { error: confirmError } = await supabase
      .rpc("confirm_cart_payment", { 
        p_user_id: order.user_id, 
        p_order_id: order.id 
      });
      
    if (confirmError) {
      console.error("Erro ao confirmar carrinho:", confirmError);
    } else {
      console.log("Carrinho confirmado com sucesso");
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook simulado com sucesso",
        tid: tid,
        orderId: orderId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error("Erro ao simular webhook:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});