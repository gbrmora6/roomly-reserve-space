
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("CLICK2PAY_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("CLICK2PAY_CLIENT_SECRET") || "";
    const publicKey = Deno.env.get("CLICK2PAY_PUBLIC_KEY") || "";
    const baseUrl = "https://apisandbox.click2pay.com.br";

    if (!clientId || !clientSecret || !publicKey) {
      throw new Error("Credenciais Click2Pay não configuradas");
    }

    const { action, userId, productIds, quantities, paymentMethod, paymentData } = await req.json();

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Cabeçalhos de autenticação Basic
    const credentials = btoa(`${clientId}:${clientSecret}`);
    const headers = {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/json"
    };

    switch (action) {
      case "create-checkout":
        if (!userId || !productIds || !quantities || productIds.length === 0) {
          throw new Error("Parâmetros obrigatórios faltando");
        }

        // Buscar dados do usuário
        const { data: userData, error: userError } = await supabase
          .auth.admin.getUserById(userId);

        if (userError || !userData) {
          console.error("Erro ao buscar dados do usuário:", userError);
          throw new Error(`Falha ao obter usuário: ${userError?.message || "Erro desconhecido"}`);
        }

        const userEmail = userData.user.email;
        
        if (!userEmail) {
          throw new Error("Email do usuário não encontrado");
        }

        // Buscar itens do carrinho do usuário para obter o total correto
        const { data: cartItems, error: cartError } = await supabase
          .rpc("get_cart", { p_user_id: userId });

        if (cartError || !cartItems || cartItems.length === 0) {
          throw new Error(`Erro ao buscar carrinho: ${cartError?.message || "Carrinho vazio"}`);
        }

        // Calcular total do carrinho
        const totalAmount = cartItems.reduce((sum, item) => sum + parseFloat(item.price), 0);

        if (totalAmount <= 0) {
          throw new Error("Valor total inválido");
        }

        // Gerar ID único do pedido
        const externalId = `pedido_${Date.now()}_${userId.substring(0, 8)}`;

        // Informações do cliente para Click2Pay
        const customerInfo = {
          name: paymentData.nomeCompleto || userData.user.user_metadata?.first_name + " " + userData.user.user_metadata?.last_name || "Cliente",
          taxid: paymentData.cpfCnpj || "00000000000",
          email: userEmail,
          phone: paymentData.telefone || "11999999999"
        };

        const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/click2pay-webhook`;

        let endpoint = "";
        let requestBody = {};

        if (paymentMethod === "cartao") {
          // Tokenizar cartão primeiro
          const tokenResponse = await fetch(`${baseUrl}/v2/tokenization/card`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
              card_number: paymentData.numeroCartao,
              card_name: paymentData.nomeNoCartao,
              card_expiration: paymentData.validadeCartao,
              card_cvv: paymentData.cvv
            })
          });

          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error("Erro ao tokenizar cartão:", errorData);
            throw new Error("Falha na tokenização do cartão");
          }

          const tokenData = await tokenResponse.json();
          const cardToken = tokenData.card_token;

          endpoint = "/v1/transactions/creditcard";
          requestBody = {
            external_identifier: externalId,
            amount: totalAmount.toFixed(2),
            installments: paymentData.parcelas || 1,
            card_token: cardToken,
            customer: customerInfo,
            callbackAddress: callbackUrl
          };
        }
        else if (paymentMethod === "boleto") {
          endpoint = "/v1/transactions/boleto";
          requestBody = {
            external_identifier: externalId,
            amount: totalAmount.toFixed(2),
            customer: customerInfo,
            callbackAddress: callbackUrl
          };
        }
        else if (paymentMethod === "pix") {
          endpoint = "/v1/transactions/pix";
          requestBody = {
            external_identifier: externalId,
            amount: totalAmount.toFixed(2),
            customer: customerInfo,
            callbackAddress: callbackUrl,
            returnQRCode: true
          };
        } else {
          throw new Error("Método de pagamento inválido");
        }

        // Chamar API Click2Pay
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("Erro na criação da transação:", data);
          throw new Error("Falha ao criar transação de pagamento");
        }

        // Criar pedido no Supabase
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: userId,
            total_amount: totalAmount,
            external_identifier: externalId,
            click2pay_tid: data.tid,
            status: "pending",
            payment_method: paymentMethod
          })
          .select("id")
          .single();

        if (orderError || !order) {
          throw new Error(`Erro ao criar pedido: ${orderError?.message || "Erro desconhecido"}`);
        }

        // Criar itens do pedido baseado nos itens do carrinho
        const orderItems = cartItems.map((cartItem) => {
          let itemName = "";
          
          // Determinar o nome do item baseado no tipo
          if (cartItem.item_type === "room") {
            itemName = `Reserva de Sala - ${cartItem.metadata?.date || ""}`;
          } else if (cartItem.item_type === "equipment") {
            itemName = `Reserva de Equipamento - ${cartItem.metadata?.date || ""}`;
          } else if (cartItem.item_type === "product") {
            itemName = `Produto - ID: ${cartItem.item_id}`;
          }

          return {
            order_id: order.id,
            product_id: cartItem.item_id,
            quantity: cartItem.quantity,
            price_per_unit: parseFloat(cartItem.price),
            branch_id: cartItem.branch_id
          };
        });

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          console.error("Erro ao criar itens do pedido:", itemsError);
        }

        // Preparar resposta baseada no método de pagamento
        let responseData = {
          success: true,
          orderId: order.id,
          externalId: externalId,
          tid: data.tid,
          status: data.status
        };

        if (paymentMethod === "cartao") {
          if (data.status === "paid" || data.status === "pre_authorized") {
            responseData = { ...responseData, message: "Pagamento aprovado" };
          } else if (data.status === "recused") {
            responseData = { ...responseData, success: false, message: "Cartão recusado" };
          }
        } else if (paymentMethod === "boleto") {
          responseData = {
            ...responseData,
            linhaDigitavel: data.digitable_line || data.barcode,
            urlBoleto: data.url_slip || null,
            vencimento: data.due_date
          };
        } else if (paymentMethod === "pix") {
          responseData = {
            ...responseData,
            qrCodeImage: data.qr_code_base64 || null,
            pixCode: data.copyPasteCode || data.emv
          };
        }

        return new Response(JSON.stringify(responseData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      default:
        return new Response(JSON.stringify({ 
          success: false,
          error: "Ação inválida"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }
  } catch (error) {
    console.error("Erro na integração Click2Pay:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
