import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentData {
  nomeCompleto: string;
  cpfCnpj: string;
  telefone: string;
  numeroCartao?: string;
  nomeNoCartao?: string;
  validadeCartao?: string;
  cvv?: string;
  parcelas?: number;
  card_hash?: string;
}

// Função para criar headers de autenticação Basic HTTP
function createBasicAuthHeaders(): Record<string, string> {
  const clientId = Deno.env.get("CLICK2PAY_CLIENT_ID");
  const clientSecret = Deno.env.get("CLICK2PAY_CLIENT_SECRET");
  
  if (!clientId || !clientSecret) {
    throw new Error("Credenciais da Click2Pay não configuradas");
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  return {
    "Authorization": `Basic ${credentials}`,
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
}

// Função para criar transação PIX
async function createPixTransaction(amount: number, externalId: string, payerData: any) {
  const payload = {
    id: externalId,
    totalAmount: parseFloat(amount.toFixed(2)),
    payerInfo: {
      name: payerData.nomeCompleto,
      taxid: payerData.cpfCnpj.replace(/\D/g, ''),
      email: payerData.email,
      phone: payerData.telefone
    },
    expiration: "86400", // 24 horas
    returnQRCode: true,
    callbackAddress: `${Deno.env.get("SUPABASE_URL")}/functions/v1/click2pay-webhook`
  };

  console.log("Criando transação PIX:", JSON.stringify(payload, null, 2));

  const response = await fetch("https://apisandbox.click2pay.com.br/v1/transactions/pix", {
    method: "POST",
    headers: createBasicAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log("Resposta da API PIX:", JSON.stringify(data, null, 2));
  
  if (!response.ok) {
    console.error("Erro ao criar transação PIX:", data);
    throw new Error(data.message || data.error || "Erro ao criar transação PIX");
  }

  return data;
}

// Função para criar transação de boleto
async function createBoletoTransaction(amount: number, externalId: string, payerData: any) {
  const payload = {
    id: externalId,
    totalAmount: parseFloat(amount.toFixed(2)),
    payerInfo: {
      name: payerData.nomeCompleto,
      taxid: payerData.cpfCnpj.replace(/\D/g, ''),
      email: payerData.email,
      phone: payerData.telefone
    },
    payment_limit_days: 3,
    description: "Pagamento de produtos/serviços",
    callbackAddress: `${Deno.env.get("SUPABASE_URL")}/functions/v1/click2pay-webhook`
  };

  console.log("Criando boleto:", JSON.stringify(payload, null, 2));

  const response = await fetch("https://apisandbox.click2pay.com.br/v1/transactions/boleto", {
    method: "POST",
    headers: createBasicAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log("Resposta da API Boleto:", JSON.stringify(data, null, 2));
  
  if (!response.ok) {
    console.error("Erro ao criar boleto:", data);
    throw new Error(data.message || data.error || "Erro ao criar boleto");
  }

  return data;
}

// Função para criar transação de cartão
async function createCardTransaction(amount: number, externalId: string, payerData: any, cardData: any) {
  const payload = {
    id: externalId,
    totalAmount: parseFloat(amount.toFixed(2)),
    payerInfo: {
      name: payerData.nomeCompleto,
      taxid: payerData.cpfCnpj.replace(/\D/g, ''),
      email: payerData.email,
      phone: payerData.telefone
    },
    cardHash: cardData.card_hash,
    capture: true,
    saveCard: false,
    installments: cardData.parcelas || 1,
    callbackAddress: `${Deno.env.get("SUPABASE_URL")}/functions/v1/click2pay-webhook`
  };

  console.log("Criando transação cartão:", JSON.stringify(payload, null, 2));

  const response = await fetch("https://apisandbox.click2pay.com.br/v1/transactions/creditcard", {
    method: "POST",
    headers: createBasicAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log("Resposta da API Cartão:", JSON.stringify(data, null, 2));
  
  if (!response.ok) {
    console.error("Erro ao criar transação de cartão:", data);
    throw new Error(data.message || data.error || "Erro ao criar transação de cartão");
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, userId, paymentMethod, paymentData } = await req.json();
    console.log("=== CLICK2PAY INTEGRATION ===");
    console.log("Action:", action);
    console.log("User ID:", userId);
    console.log("Payment Method:", paymentMethod);

    switch (action) {
      case "create-checkout":
        if (!userId || !paymentMethod || !paymentData) {
          throw new Error("Parâmetros obrigatórios faltando");
        }

        // Buscar dados do usuário
        const { data: userData, error: userError } = await supabase
          .auth.admin.getUserById(userId);

        if (userError || !userData.user) {
          console.error("Erro ao buscar usuário:", userError);
          throw new Error("Usuário não encontrado");
        }

        const userEmail = userData.user.email;
        if (!userEmail) {
          throw new Error("Email do usuário não encontrado");
        }

        // Buscar branch_id do usuário
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("branch_id")
          .eq("id", userId)
          .single();

        if (profileError || !userProfile?.branch_id) {
          console.error("Erro ao buscar branch do usuário:", profileError);
          throw new Error("Branch do usuário não encontrado");
        }

        // Buscar carrinho do usuário
        console.log("Buscando carrinho para usuário:", userId);
        const { data: cartItems, error: cartError } = await supabase
          .rpc("get_cart", { p_user_id: userId });

        if (cartError) {
          console.error("Erro ao buscar carrinho:", cartError);
          throw new Error(`Erro ao buscar carrinho: ${cartError.message}`);
        }

        if (!cartItems || cartItems.length === 0) {
          throw new Error("Carrinho vazio");
        }

        // Calcular total do carrinho
        const totalAmount = cartItems.reduce((sum, item) => {
          const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
          console.log(`Item ${item.id}: R$ ${item.price} x ${item.quantity} = R$ ${itemTotal}`);
          return sum + itemTotal;
        }, 0);

        console.log("Total calculado do carrinho: R$", totalAmount);
        if (totalAmount <= 0) {
          throw new Error("Valor total inválido");
        }

        // Criar pedido
        const externalId = `order_${Date.now()}_${userId.slice(0, 8)}`;
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: userId,
            total_amount: totalAmount,
            status: "pending",
            payment_method: paymentMethod,
            external_identifier: externalId,
            branch_id: userProfile.branch_id
          })
          .select()
          .single();

        if (orderError || !order) {
          console.error("Erro ao criar pedido:", orderError);
          throw new Error("Erro ao criar pedido");
        }

        console.log("Pedido criado:", order.id);

        // Criar itens do pedido para produtos
        const orderItems = cartItems
          .filter(item => item.item_type === "product")
          .map(item => ({
            order_id: order.id,
            product_id: item.item_id,
            quantity: item.quantity,
            price_per_unit: parseFloat(item.price),
            branch_id: item.branch_id
          }));

        if (orderItems.length > 0) {
          const { error: itemsError } = await supabase
            .from("order_items")
            .insert(orderItems);

          if (itemsError) {
            console.error("Erro ao criar itens do pedido:", itemsError);
            throw new Error("Erro ao criar itens do pedido");
          }
        }

        // Preparar dados do pagador
        const payerData = {
          ...paymentData,
          email: userEmail
        };

        let transactionResult;

        // Processar pagamento baseado no método
        switch (paymentMethod) {
          case "pix":
            transactionResult = await createPixTransaction(totalAmount, externalId, payerData);
            break;
          case "boleto":
            transactionResult = await createBoletoTransaction(totalAmount, externalId, payerData);
            break;
          case "cartao":
            if (!paymentData.card_hash) {
              throw new Error("Hash do cartão não fornecido - use cardc2p.js no frontend");
            }
            transactionResult = await createCardTransaction(totalAmount, externalId, payerData, paymentData);
            break;
          default:
            throw new Error(`Método de pagamento não suportado: ${paymentMethod}`);
        }

        // Atualizar pedido com TID da transação
        await supabase
          .from("orders")
          .update({
            click2pay_tid: transactionResult.tid,
            status: transactionResult.status === "paid" ? "paid" : "pending"
          })
          .eq("id", order.id);

        console.log("Transação criada com sucesso:", transactionResult.tid);

        // Preparar resposta baseada no método
        let responseData: any = {
          success: true,
          orderId: order.id,
          tid: transactionResult.tid,
          status: transactionResult.status,
          paymentMethod
        };

        // Adicionar dados específicos do método de pagamento
        if (paymentMethod === "pix") {
          responseData = {
            ...responseData,
            qrCode: transactionResult.qrCode,
            qrCodeImage: transactionResult.qrCodeImage,
            pixCode: transactionResult.pixCode || transactionResult.copyPasteCode
          };
        } else if (paymentMethod === "boleto") {
          responseData = {
            ...responseData,
            boletoUrl: transactionResult.url_slip || transactionResult.url,
            barcodeNumber: transactionResult.digitable_line || transactionResult.barcode,
            dueDate: transactionResult.due_date
          };
        } else if (paymentMethod === "cartao") {
          responseData = {
            ...responseData,
            message: transactionResult.status === "paid" ? "Pagamento aprovado" : 
                    transactionResult.status === "recused" ? "Cartão recusado" : "Aguardando confirmação"
          };
        }

        return new Response(
          JSON.stringify(responseData),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );

      case "approve-boleto-sandbox":
        // Função para aprovar boleto no sandbox para testes
        const body = await req.json();
        if (!body || !body.tid) {
          throw new Error("TID do boleto é obrigatório");
        }

        const { tid } = body;
        console.log("Aprovando boleto no sandbox:", tid);

        const approveResponse = await fetch(`https://apisandbox.click2pay.com.br/v1/transactions/boleto/${tid}/approve`, {
          method: "POST",
          headers: {
            "accept": "application/json"
          }
        });

        const approveData = await approveResponse.json();
        
        if (!approveResponse.ok) {
          console.error("Erro ao aprovar boleto:", approveData);
          throw new Error("Falha ao aprovar boleto no sandbox");
        }

        console.log("Boleto aprovado com sucesso:", approveData);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Boleto aprovado no sandbox",
            data: approveData
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );

      default:
        throw new Error(`Ação não reconhecida: ${action}`);
    }

  } catch (error) {
    console.error("Erro no processamento:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});