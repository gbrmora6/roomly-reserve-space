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
    
    console.log("=== CHECK PAYMENT STATUS INICIADO ===");
    console.log("Order ID:", orderId);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Buscar a ordem
    console.log("1. Buscando ordem:", orderId);
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
      
    if (orderError) {
      console.error("Erro ao buscar ordem:", orderError);
      throw new Error(`Ordem não encontrada: ${orderError.message}`);
    }
    
    console.log("2. Ordem encontrada:", {
      id: order.id,
      status: order.status,
      click2pay_tid: order.click2pay_tid,
      external_identifier: order.external_identifier
    });
    
    // Se não tiver TID, não é possível verificar
    if (!order.click2pay_tid) {
      console.log("3. Ordem não possui TID da Click2Pay");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Ordem não possui TID da Click2Pay para verificação"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Verificar se já está pago
    if (order.status === "paid") {
      console.log("4. Ordem já está paga");
      return new Response(
        JSON.stringify({
          success: true,
          status: "paid",
          message: "Pagamento já confirmado"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("5. Verificando status na Click2Pay...");
    
    const clientId = Deno.env.get("CLICK2PAY_CLIENT_ID");
    const clientSecret = Deno.env.get("CLICK2PAY_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      throw new Error("Credenciais da Click2Pay não configuradas");
    }
    
    // Consultar status na Click2Pay usando o TID
    const response = await fetch(`https://api.click2pay.com.br/v1/transactions/${order.click2pay_tid}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API Click2Pay:", response.status, errorText);
      throw new Error(`Erro ao consultar status: ${response.status}`);
    }
    
    const click2payStatus = await response.json();
    console.log("6. Status Click2Pay recebido:", JSON.stringify(click2payStatus, null, 2));
    
    // Atualizar status baseado na resposta
    let newStatus = order.status;
    let shouldConfirmCart = false;
    
    if (click2payStatus.success && click2payStatus.data) {
      const transactionStatus = click2payStatus.data.status;
      
      console.log("7. Status da transação:", transactionStatus);
      
      switch (transactionStatus) {
        case "paid":
          newStatus = "paid";
          shouldConfirmCart = true;
          break;
        case "cancelled":
        case "recused":
        case "expired":
          newStatus = "recused";
          break;
        case "authorized":
          newStatus = "authorized";
          break;
        default:
          console.log("Status não mapeado:", transactionStatus);
      }
    }
    
    // Atualizar status se mudou
    if (newStatus !== order.status) {
      console.log("8. Atualizando status:", order.status, "->", newStatus);
      
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);
        
      if (updateError) {
        console.error("Erro ao atualizar status:", updateError);
        throw new Error("Erro ao atualizar status da ordem");
      }
      
      // Se foi pago, confirmar carrinho
      if (shouldConfirmCart) {
        console.log("9. Confirmando carrinho para usuário:", order.user_id);
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
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        status: newStatus,
        originalStatus: order.status,
        updated: newStatus !== order.status,
        message: newStatus === "paid" ? "Pagamento confirmado" : 
                newStatus === "recused" ? "Pagamento recusado/cancelado" : 
                "Status verificado"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error("Erro ao verificar status:", error);
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