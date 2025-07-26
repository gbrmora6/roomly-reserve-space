
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
      console.log("=== PAGAMENTO CONFIRMADO ===");
      console.log("Processando pagamento PIX/Cartão confirmado...");
      
      // Atualizar pedido usando o tid da Click2Pay
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: "paid",
          updated_at: new Date().toISOString()
        })
        .eq("click2pay_tid", transacaoId)
        .select('id, user_id, total_amount, payment_method')
        .single();

      if (orderError) {
        console.error("Erro ao atualizar pedido:", orderError);
        throw new Error("Falha ao atualizar status do pedido");
      }

      if (!orderData) {
        console.error("Pedido não encontrado para TID:", transacaoId);
        throw new Error("Pedido não encontrado");
      }

      console.log("✅ Pedido atualizado:", {
        orderId: orderData.id,
        userId: orderData.user_id,
        amount: orderData.total_amount,
        method: orderData.payment_method
      });

      // Confirmar o carrinho (confirmar bookings e equipment_bookings + limpar carrinho)
      console.log("🔄 Confirmando carrinho e reservas...");
      const { data: confirmResult, error: confirmError } = await supabase
        .rpc("confirm_cart_payment", { 
          p_user_id: orderData.user_id, 
          p_order_id: orderData.id 
        });

      if (confirmError) {
        console.error("❌ Erro ao confirmar carrinho:", confirmError);
        // Fallback manual se a função RPC falhar
      } else {
        console.log("✅ Carrinho confirmado via RPC para usuário:", orderData.user_id);
        console.log("✅ Reservas confirmadas e carrinho limpo automaticamente");
      }

      // Atualizar diretamente as reservas relacionadas ao pedido se a função falhar
      if (confirmError) {
        console.log("Tentando atualizar reservas diretamente...");
        
        // Buscar e atualizar bookings relacionados
        const { data: bookings, error: bookingsError } = await supabase
          .from("bookings")
          .select("id")
          .eq("user_id", orderData.user_id)
          .eq("status", "in_process");

        if (!bookingsError && bookings && bookings.length > 0) {
          const bookingIds = bookings.map(b => b.id);
          const { error: updateBookingsError } = await supabase
            .from("bookings")
            .update({ status: "paid", updated_at: new Date().toISOString() })
            .in("id", bookingIds);

          if (updateBookingsError) {
            console.error("Erro ao atualizar bookings diretamente:", updateBookingsError);
          } else {
            console.log("Bookings atualizados diretamente:", bookingIds);
          }
        }

        // Buscar e atualizar equipment bookings relacionados
        const { data: equipmentBookings, error: equipmentError } = await supabase
          .from("booking_equipment")
          .select("id")
          .eq("user_id", orderData.user_id)
          .eq("status", "in_process");

        if (!equipmentError && equipmentBookings && equipmentBookings.length > 0) {
          const equipmentBookingIds = equipmentBookings.map(b => b.id);
          const { error: updateEquipmentError } = await supabase
            .from("booking_equipment")
            .update({ status: "paid", updated_at: new Date().toISOString() })
            .in("id", equipmentBookingIds);

          if (updateEquipmentError) {
            console.error("Erro ao atualizar equipment bookings diretamente:", updateEquipmentError);
          } else {
            console.log("Equipment bookings atualizados diretamente:", equipmentBookingIds);
          }
        }

        // Como a função confirm_cart_payment falhou, limpar carrinho manualmente
        const { error: clearCartError } = await supabase
          .from("cart_items")
          .delete()
          .eq("user_id", orderData.user_id);

        if (clearCartError) {
          console.error("Erro ao limpar carrinho manualmente:", clearCartError);
        } else {
          console.log("Carrinho limpo manualmente após falha da função confirm_cart_payment");
        }
      }

      console.log(`Pedido com TID ${transacaoId} marcado como pago via ${metodo}.`);

    } else if (status === "cancelled" || status === "recused" || status === "expired") {
      console.log("Pagamento cancelado/recusado/expirado - processando...");
      
      // Pagamento cancelado/recusado/expirado
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: "recused",
          updated_at: new Date().toISOString()
        })
        .eq("click2pay_tid", transacaoId)
        .select('id, user_id')
        .single();

      if (orderError) {
        console.error("Erro ao cancelar pedido:", orderError);
        throw new Error("Falha ao cancelar pedido");
      }

      if (orderData) {
        // Cancelar reservas relacionadas
        const { error: cancelBookingsError } = await supabase
          .from("bookings")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("user_id", orderData.user_id)
          .eq("status", "in_process");

        if (cancelBookingsError) {
          console.error("Erro ao cancelar bookings:", cancelBookingsError);
        }

        const { error: cancelEquipmentError } = await supabase
          .from("booking_equipment")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("user_id", orderData.user_id)
          .eq("status", "in_process");

        if (cancelEquipmentError) {
          console.error("Erro ao cancelar equipment bookings:", cancelEquipmentError);
        }

        console.log(`Pedido com TID ${transacaoId} cancelado/recusado/expirado.`);
      }
      
    } else if (status === "authorized") {
      console.log("Pagamento autorizado - processando...");
      
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
      
    } else if (status === "captured") {
      console.log("Pagamento capturado - processando...");
      
      // Pagamento capturado com sucesso após autorização
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: "paid",
          updated_at: new Date().toISOString()
        })
        .eq("click2pay_tid", transacaoId)
        .select('id, user_id')
        .single();

      if (orderError) {
        console.error("Erro ao atualizar pedido para pago:", orderError);
        throw new Error("Falha ao atualizar pedido");
      }

      if (orderData) {
        // Confirmar reservas usando a função RPC
        const { error: confirmError } = await supabase.rpc("confirm_cart_payment", {
          p_user_id: orderData.user_id,
          p_order_id: orderData.id
        });

        if (confirmError) {
          console.error("Erro ao confirmar carrinho via RPC:", confirmError);
          // Fallback: confirmar manualmente
          const { error: clearCartError } = await supabase
            .from("cart_items")
            .delete()
            .eq("user_id", orderData.user_id);

          if (clearCartError) {
            console.error("Erro ao limpar carrinho manualmente:", clearCartError);
          } else {
            console.log("Carrinho limpo manualmente após falha da função confirm_cart_payment");
          }
        }
      }

      console.log(`Pedido com TID ${transacaoId} capturado e confirmado.`);
      
    } else if (status === "refunded" || tipoEvento === "PAYMENT_REFUNDED") {
      console.log("=== ESTORNO CONFIRMADO ===");
      console.log("Processando confirmação de estorno...");
      
      // Estorno confirmado
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: "recused",
          refund_status: "completed",
          refund_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("click2pay_tid", transacaoId)
        .select('id, user_id, total_amount, payment_method')
        .single();

      if (orderError) {
        console.error("❌ Erro ao atualizar pedido estornado:", orderError);
        throw new Error("Falha ao processar estorno");
      }

      if (orderData) {
        console.log("✅ Pedido marcado como estornado:", {
          orderId: orderData.id,
          userId: orderData.user_id,
          amount: orderData.total_amount,
          method: orderData.payment_method
        });

        // Cancelar reservas relacionadas usando a função RPC melhorada
        console.log("🔄 Cancelando reservas relacionadas...");
        const { data: cancelResult, error: cancelError } = await supabase
          .rpc('cancel_order_reservations', { p_order_id: orderData.id });
        
        if (cancelError) {
          console.error("❌ Erro ao cancelar reservas via RPC:", cancelError);
        } else {
          console.log("✅ Reservas canceladas via webhook:", cancelResult);
        }
      }

      console.log(`✅ Estorno processado: TID ${transacaoId} - Pedido estornado e reservas canceladas.`);
      
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
