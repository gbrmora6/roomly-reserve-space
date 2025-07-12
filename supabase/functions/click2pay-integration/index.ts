import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";
import sdk from "https://esm.sh/api@6.1.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configurar SDK Click2Pay
sdk.configure({
  baseURL: "https://apisandbox.click2pay.com.br",
  timeout: 30000,
});

// Função para validar CPF
function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  return cpf.length === 11 && !/^(\d)\1{10}$/.test(cpf);
}

// Função para validar dados obrigatórios
function validatePaymentData(paymentData: any, paymentMethod: string): string[] {
  const errors: string[] = [];
  
  if (!paymentData.nomeCompleto?.trim()) {
    errors.push("Nome completo é obrigatório");
  }
  
  if (!paymentData.cpfCnpj?.trim()) {
    errors.push("CPF/CNPJ é obrigatório");
  } else if (!isValidCPF(paymentData.cpfCnpj)) {
    errors.push("CPF inválido");
  }
  
  if (!paymentData.telefone?.trim()) {
    errors.push("Telefone é obrigatório");
  }

  // Validações específicas por método
  if (paymentMethod === "cartao") {
    if (!paymentData.card_hash?.trim()) {
      errors.push("Hash do cartão é obrigatório");
    }
  }
  
  return errors;
}

// Função para preparar dados do cliente
function prepareCustomerData(paymentData: any) {
  return {
    name: paymentData.nomeCompleto.trim(),
    document: paymentData.cpfCnpj.replace(/[^\d]/g, ''),
    phone: paymentData.telefone.replace(/[^\d]/g, ''),
    email: paymentData.email || "",
    address: {
      street: paymentData.endereco || "",
      number: paymentData.numero || "",
      neighborhood: paymentData.bairro || "",
      city: paymentData.cidade || "",
      state: paymentData.estado || "",
      zipcode: paymentData.cep?.replace(/[^\d]/g, '') || ""
    }
  };
}

serve(async (req) => {
  console.log("=== CLICK2PAY INTEGRATION INICIADO ===");
  
  if (req.method === "OPTIONS") {
    console.log("Requisição OPTIONS - retornando CORS");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("1. Processando requisição...");
    console.log("Method:", req.method);
    console.log("URL:", req.url);

    // Ler body
    let body;
    try {
      body = await req.json();
      console.log("2. Body recebido:", JSON.stringify(body, null, 2));
    } catch (error) {
      console.error("Erro ao fazer parse do JSON:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const clientId = Deno.env.get("CLICK2PAY_CLIENT_ID");
    const clientSecret = Deno.env.get("CLICK2PAY_CLIENT_SECRET");

    console.log("3. Verificando variáveis de ambiente...");
    console.log("- SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
    console.log("- SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");
    console.log("- CLICK2PAY_CLIENT_ID:", clientId ? "✓" : "✗");
    console.log("- CLICK2PAY_CLIENT_SECRET:", clientSecret ? "✓" : "✗");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis do Supabase não configuradas");
    }

    if (!clientId || !clientSecret) {
      throw new Error("Credenciais da Click2Pay não configuradas");
    }

    // Configurar autenticação do SDK
    sdk.auth(clientId, clientSecret);

    // Criar cliente Supabase
    console.log("4. Criando cliente Supabase...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, userId, paymentMethod, paymentData } = body;
    console.log("5. Parâmetros extraídos:", { action, userId, paymentMethod });

    if (action !== "create-checkout") {
      throw new Error(`Ação não suportada: ${action}`);
    }

    if (!userId || !paymentMethod || !paymentData) {
      throw new Error("Parâmetros obrigatórios faltando");
    }

    // Validar dados de pagamento
    console.log("6. Validando dados de pagamento...");
    const validationErrors = validatePaymentData(paymentData, paymentMethod);
    if (validationErrors.length > 0) {
      throw new Error(`Dados inválidos: ${validationErrors.join(", ")}`);
    }

    // Buscar dados do usuário
    console.log("7. Buscando dados do usuário...");
    const { data: userData, error: userError } = await supabase
      .auth.admin.getUserById(userId);

    if (userError) {
      console.error("Erro ao buscar usuário:", userError);
      throw new Error(`Erro ao buscar usuário: ${userError.message}`);
    }

    if (!userData?.user) {
      throw new Error("Usuário não encontrado");
    }

    console.log("8. Usuário encontrado:", userData.user.email);

    // Buscar profile do usuário para obter branch_id
    console.log("8.1. Buscando profile do usuário...");
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('branch_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Erro ao buscar profile:", profileError);
      throw new Error(`Erro ao buscar profile do usuário: ${profileError.message}`);
    }

    if (!profile?.branch_id) {
      throw new Error("Usuário não possui branch_id válido");
    }

    console.log("8.2. Branch ID encontrado:", profile.branch_id);

    // Buscar carrinho do usuário
    console.log("9. Buscando carrinho do usuário...");
    const { data: cartItems, error: cartError } = await supabase
      .rpc('get_cart', { p_user_id: userId });

    if (cartError) {
      console.error("Erro ao buscar carrinho:", cartError);
      throw new Error(`Erro ao buscar carrinho: ${cartError.message}`);
    }

    if (!cartItems || cartItems.length === 0) {
      throw new Error("Carrinho vazio");
    }

    console.log("10. Carrinho encontrado com", cartItems.length, "itens");

    // Calcular total
    const totalAmount = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    console.log("11. Valor total:", totalAmount);

    // Criar ordem no banco
    console.log("12. Criando ordem no banco...");
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        branch_id: profile.branch_id,
        total_amount: totalAmount,
        status: 'pending',
        payment_method: paymentMethod
      })
      .select()
      .single();

    if (orderError) {
      console.error("Erro ao criar ordem:", orderError);
      throw new Error(`Erro ao criar ordem: ${orderError.message}`);
    }

    console.log("13. Ordem criada:", order.id);

    // Criar itens da ordem
    console.log("14. Criando itens da ordem...");
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.item_id,
      quantity: item.quantity,
      price_per_unit: item.price,
      branch_id: profile.branch_id
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error("Erro ao criar itens da ordem:", itemsError);
      throw new Error(`Erro ao criar itens da ordem: ${itemsError.message}`);
    }

    // Preparar dados para Click2Pay
    console.log("15. Preparando dados para Click2Pay...");
    
    // Dados do cliente
    const customer = prepareCustomerData(paymentData);
    
    // Dados base para todas as transações
    const basePayload = {
      amount: Math.round(totalAmount * 100), // Click2Pay espera centavos
      description: `Pedido #${order.id}`,
      external_identifier: order.id,
      customer
    };

    let click2payResult: any;

    try {
      switch (paymentMethod) {
        case "boleto":
          console.log("16. Criando boleto via SDK...");
          click2payResult = await sdk.criarBoletos({
            ...basePayload,
            payment_limit_days: 3,
            fine: {
              mode: "FIXED",
              value: 200 // R$ 2,00
            },
            interest: {
              mode: "DAILY_AMOUNT",
              value: 100 // R$ 1,00 por dia
            }
          });
          break;

        case "pix":
          console.log("16. Criando PIX via SDK...");
          click2payResult = await sdk.pixAdicionarTransaO({
            ...basePayload,
            expiration: "86400", // 24 horas
            returnQRCode: true
          });
          break;

        case "cartao":
          console.log("16. Criando transação de cartão via SDK...");
          click2payResult = await sdk.criarCreditcard({
            ...basePayload,
            card_hash: paymentData.card_hash,
            installments: paymentData.parcelas || 1,
            capture: true,
            saveCard: false,
            recurrent: false
          });
          break;

        default:
          throw new Error(`Método de pagamento não suportado: ${paymentMethod}`);
      }
    } catch (sdkError) {
      console.error("Erro no SDK Click2Pay:", sdkError);
      throw new Error(`Erro na API Click2Pay: ${sdkError.message || 'Erro desconhecido'}`);
    }

    console.log("17. Resposta Click2Pay via SDK:", JSON.stringify(click2payResult, null, 2));

    // Verificar se a resposta do SDK é válida
    if (!click2payResult || !click2payResult.data) {
      throw new Error("Resposta inválida da API Click2Pay");
    }

    const responseData = click2payResult.data;

    // Atualizar ordem com dados da Click2Pay
    console.log("18. Atualizando ordem com dados da Click2Pay...");
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        click2pay_tid: responseData.tid || responseData.id,
        status: responseData.status || 'pending',
        external_identifier: responseData.external_identifier || order.id
      })
      .eq('id', order.id);

    if (updateError) {
      console.error("Erro ao atualizar ordem:", updateError);
      // Não falhar aqui, apenas logar
    }

    // Confirmar pagamento se já estiver pago (PIX instantâneo, por exemplo)
    if (responseData.status === 'paid') {
      console.log("19. Confirmando pagamento do carrinho...");
      const { error: confirmError } = await supabase
        .rpc('confirm_cart_payment', { 
          p_user_id: userId, 
          p_order_id: order.id 
        });

      if (confirmError) {
        console.error("Erro ao confirmar pagamento:", confirmError);
      }
    }

    console.log("20. Processamento concluído com sucesso");

    // Preparar resposta baseada no método de pagamento
    let response: any = {
      success: true,
      orderId: order.id,
      status: responseData.status,
      paymentMethod,
      tid: responseData.tid || responseData.id
    };

    // Adicionar dados específicos do método de pagamento
    switch (paymentMethod) {
      case "boleto":
        response.boleto = {
          url: responseData.boleto_url,
          barcode: responseData.barcode,
          due_date: responseData.due_date
        };
        break;

      case "pix":
        response.pix = {
          qr_code: responseData.qr_code,
          qr_code_url: responseData.qr_code_url,
          expires_at: responseData.expires_at
        };
        break;

      case "cartao":
        response.card = {
          authorization_code: responseData.authorization_code,
          captured: responseData.captured
        };
        break;
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("=== ERRO NO EDGE FUNCTION ===");
    console.error("Tipo:", error.constructor.name);
    console.error("Mensagem:", error.message);
    console.error("Stack:", error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        type: error.constructor.name
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});