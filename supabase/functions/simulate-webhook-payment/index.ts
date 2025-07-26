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
    
    console.log("=== SIMULANDO WEBHOOK DE PAGAMENTO CONFIRMADO ===");
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
    
    console.log("Ordem encontrada:", order);
    console.log("TID atual:", order.click2pay_tid);
    console.log("Status atual:", order.status);
    
    // Simular webhook payload da Click2Pay
    const webhookPayload = {
      type: "PAYMENT_RECEIVED",
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      proccess_id: "A6505163-ABCD-DAE3-EFG5-BB63E15D3C1A",
      tid: order.click2pay_tid || "978e821c-1449-4670-baab-f9aa29079355",
      external_identifier: order.external_identifier || order.id.substring(0, 8),
      status: "paid",
      status_reason: null,
      transaction_type: "InstantPayment",
      customer: {
        name: "CLIENTE TESTE",
        taxid: "*******",
        email: "*******",
        phone: "*******"
      },
      payment: {
        sender: {
          name: "CLIENTE TESTE",
          taxid: "***.000.000-**"
        },
        amount: order.total_amount.toString(),
        paid_amount: parseFloat(order.total_amount.toString()),
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        psp: "BANCO TESTE",
        endToEndId: "E00000000001111111122lCZT7NTu000",
        reference: "QRS2TXW5I2Q8R1GIBGUSSB8FZBQW60OPDXV"
      }
    };
    
    console.log("Webhook payload criado:", webhookPayload);
    
    // 1. Atualizar status da ordem para 'paid'
    console.log("=== 1. ATUALIZANDO ORDEM ===");
    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({ 
        status: "paid",
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);
      
    if (orderUpdateError) {
      console.error("Erro ao atualizar ordem:", orderUpdateError);
      throw orderUpdateError;
    } else {
      console.log("✅ Ordem atualizada para status 'paid'");
    }
    
    // 2. Confirmar reservas usando a função confirm_cart_payment
    console.log("=== 2. CONFIRMANDO RESERVAS ===");
    const { error: confirmError } = await supabase
      .rpc("confirm_cart_payment", { 
        p_user_id: order.user_id, 
        p_order_id: order.id 
      });
      
    if (confirmError) {
      console.error("Erro ao confirmar carrinho:", confirmError);
    } else {
      console.log("✅ Reservas confirmadas via confirm_cart_payment");
    }
    
    // 3. Verificar estado final das reservas
    console.log("=== 3. VERIFICANDO ESTADO FINAL ===");
    
    // Verificar reservas de sala
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, status, order_id, room_id")
      .eq("user_id", order.user_id)
      .order("created_at", { ascending: false })
      .limit(3);
      
    console.log("Reservas de sala após confirmação:", bookings);
    
    // Verificar reservas de equipamento  
    const { data: equipmentBookings } = await supabase
      .from("booking_equipment")
      .select("id, status, order_id, equipment_id")
      .eq("user_id", order.user_id)
      .order("created_at", { ascending: false })
      .limit(3);
      
    console.log("Reservas de equipamento após confirmação:", equipmentBookings);
    
    // Verificar estado final da ordem
    const { data: finalOrder } = await supabase
      .from("orders")
      .select("id, status, user_id, total_amount")
      .eq("id", orderId)
      .single();
      
    console.log("Estado final da ordem:", finalOrder);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook de pagamento simulado com sucesso",
        orderId: orderId,
        tid: order.click2pay_tid,
        webhookPayload: webhookPayload,
        results: {
          order: finalOrder,
          bookings: bookings,
          equipmentBookings: equipmentBookings
        }
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