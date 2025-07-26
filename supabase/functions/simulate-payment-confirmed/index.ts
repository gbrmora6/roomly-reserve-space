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
    
    console.log("=== SIMULANDO WEBHOOK PAYMENT_RECEIVED ===");
    console.log("Order ID:", orderId);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Buscar a ordem
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
      
    if (orderError) {
      throw new Error(`Ordem não encontrada: ${orderError.message}`);
    }
    
    console.log("Ordem encontrada:", {
      id: order.id,
      status: order.status,
      user_id: order.user_id,
      click2pay_tid: order.click2pay_tid
    });
    
    const tid = order.click2pay_tid;
    if (!tid) {
      throw new Error("TID não encontrado na ordem");
    }
    
    // === SIMULAR WEBHOOK COMO SE FOSSE A CLICK2PAY ===
    
    console.log("=== 1. ATUALIZANDO STATUS DA ORDEM ===");
    // Atualizar ordem para 'paid' usando o TID (como faz o webhook real)
    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from("orders")
      .update({ 
        status: "paid",
        updated_at: new Date().toISOString()
      })
      .eq("click2pay_tid", tid)
      .select('id, user_id, total_amount, payment_method')
      .single();

    if (updateOrderError) {
      console.error("Erro ao atualizar ordem:", updateOrderError);
      throw updateOrderError;
    }

    if (!updatedOrder) {
      throw new Error("Ordem não foi atualizada");
    }

    console.log("✅ Ordem atualizada para 'paid':", updatedOrder.id);

    console.log("=== 2. CONFIRMANDO CARRINHO VIA RPC ===");
    // Confirmar o carrinho usando a função RPC
    const { data: confirmResult, error: confirmError } = await supabase
      .rpc("confirm_cart_payment", { 
        p_user_id: updatedOrder.user_id, 
        p_order_id: updatedOrder.id 
      });

    if (confirmError) {
      console.error("❌ Erro ao confirmar carrinho via RPC:", confirmError);
      
      console.log("=== FALLBACK: ATUALIZANDO RESERVAS DIRETAMENTE ===");
      
      // Fallback: atualizar reservas diretamente (como faz o webhook)
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id")
        .eq("user_id", updatedOrder.user_id)
        .eq("status", "in_process");

      if (!bookingsError && bookings && bookings.length > 0) {
        const bookingIds = bookings.map(b => b.id);
        console.log("Atualizando bookings:", bookingIds);
        
        const { error: updateBookingsError } = await supabase
          .from("bookings")
          .update({ 
            status: "paid", 
            order_id: updatedOrder.id,
            updated_at: new Date().toISOString() 
          })
          .in("id", bookingIds);

        if (updateBookingsError) {
          console.error("Erro ao atualizar bookings:", updateBookingsError);
        } else {
          console.log("✅ Bookings atualizados:", bookingIds);
        }
      }

      // Atualizar equipment bookings
      const { data: equipmentBookings, error: equipmentError } = await supabase
        .from("booking_equipment")
        .select("id")
        .eq("user_id", updatedOrder.user_id)
        .eq("status", "in_process");

      if (!equipmentError && equipmentBookings && equipmentBookings.length > 0) {
        const equipmentBookingIds = equipmentBookings.map(b => b.id);
        console.log("Atualizando equipment bookings:", equipmentBookingIds);
        
        const { error: updateEquipmentError } = await supabase
          .from("booking_equipment")
          .update({ 
            status: "paid", 
            order_id: updatedOrder.id,
            updated_at: new Date().toISOString() 
          })
          .in("id", equipmentBookingIds);

        if (updateEquipmentError) {
          console.error("Erro ao atualizar equipment bookings:", updateEquipmentError);
        } else {
          console.log("✅ Equipment bookings atualizados:", equipmentBookingIds);
        }
      }

      // Limpar carrinho manualmente
      const { error: clearCartError } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", updatedOrder.user_id);

      if (clearCartError) {
        console.error("Erro ao limpar carrinho:", clearCartError);
      } else {
        console.log("✅ Carrinho limpo manualmente");
      }
      
    } else {
      console.log("✅ Carrinho confirmado via RPC");
    }

    console.log("=== 3. VERIFICANDO ESTADO FINAL ===");
    
    // Verificar estado final
    const { data: finalOrder } = await supabase
      .from("orders")
      .select("id, status, user_id, total_amount")
      .eq("id", orderId)
      .single();
      
    const { data: finalBookings } = await supabase
      .from("bookings")
      .select("id, status, order_id, room_id")
      .eq("user_id", order.user_id)
      .order("created_at", { ascending: false })
      .limit(3);
      
    const { data: finalEquipmentBookings } = await supabase
      .from("booking_equipment")
      .select("id, status, order_id, equipment_id")
      .eq("user_id", order.user_id)
      .order("created_at", { ascending: false })
      .limit(3);

    const { data: remainingCartItems } = await supabase
      .from("cart_items")
      .select("count")
      .eq("user_id", order.user_id);

    console.log("Estado final - Ordem:", finalOrder);
    console.log("Estado final - Bookings:", finalBookings);
    console.log("Estado final - Equipment Bookings:", finalEquipmentBookings);
    console.log("Itens restantes no carrinho:", remainingCartItems?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook de pagamento simulado com sucesso",
        tid: tid,
        orderId: orderId,
        results: {
          order: finalOrder,
          bookings: finalBookings,
          equipmentBookings: finalEquipmentBookings,
          cartItemsRemaining: remainingCartItems?.length || 0
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