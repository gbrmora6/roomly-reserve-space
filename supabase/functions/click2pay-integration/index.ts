
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URLs da API Click2Pay - usando API de PRODUÇÃO conforme exemplos
const CLICK2PAY_BASE_URL = "https://api.click2pay.com.br";

// Função para fazer requisições HTTP para Click2Pay seguindo EXATAMENTE os exemplos fornecidos
async function makeClick2PayRequest(endpoint: string, data: any, clientId: string, clientSecret: string) {
  console.log(`Fazendo requisição para: ${CLICK2PAY_BASE_URL}${endpoint}`);
  console.log(`Dados enviados:`, JSON.stringify(data, null, 2));
  
  // Criando Basic Auth exatamente como no exemplo
  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(`${CLICK2PAY_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'authorization': `Basic ${auth}`
    },
    body: JSON.stringify(data)
  });

  const responseText = await response.text();
  console.log(`Resposta da Click2Pay (${response.status}):`, responseText);

  if (!response.ok) {
    throw new Error(`Click2Pay API Error: ${response.status} - ${responseText}`);
  }

  return JSON.parse(responseText);
}

// Função para validar CPF
function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  let digit1 = (remainder >= 10) ? 0 : remainder;
  
  if (parseInt(cpf.charAt(9)) !== digit1) {
    return false;
  }
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  let digit2 = (remainder >= 10) ? 0 : remainder;
  
  return parseInt(cpf.charAt(10)) === digit2;
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
    errors.push("CPF/CNPJ inválido");
  }
  
  if (!paymentData.telefone?.trim()) {
    errors.push("Telefone é obrigatório");
  }

  if (paymentMethod === "cartao") {
    if (!paymentData.card_hash?.trim()) {
      errors.push("Hash do cartão é obrigatório");
    }
  }
  
  return errors;
}

// Função para preparar dados do cliente seguindo estrutura exata dos exemplos
function prepareCustomerData(paymentData: any, userEmail: string) {
  if (!paymentData) {
    throw new Error("Dados de pagamento não fornecidos");
  }

  return {
    payerInfo: {
      address: {
        place: paymentData.rua || "",
        number: paymentData.numero || "",
        complement: paymentData.complemento || "",
        neighborhood: paymentData.bairro || "",
        city: paymentData.cidade || "",
        state: paymentData.estado || "",
        zipcode: paymentData.cep?.replace(/[^\d]/g, '') || ""
      },
      name: (paymentData.nomeCompleto || "").trim(),
      taxid: (paymentData.cpfCnpj || "").replace(/[^\d]/g, ''),
      phonenumber: (paymentData.telefone || "").replace(/[^\d]/g, ''),
      email: paymentData.email || userEmail || "",
      birth_date: paymentData.dataNascimento || "1990-01-01"
    }
  };
}

serve(async (req) => {
  try {
    console.log("=== CLICK2PAY INTEGRATION INICIADO ===");
    console.log("Method:", req.method);
    console.log("URL:", req.url);
    
    if (req.method === "OPTIONS") {
      console.log("Requisição OPTIONS - retornando CORS");
      return new Response(null, { headers: corsHeaders });
    }

    console.log("1. Processando requisição...");
    
    let body;
    try {
      const text = await req.text();
      console.log("2.1. Text recebido:", text);
      body = JSON.parse(text);
      console.log("2.2. Body parseado:", JSON.stringify(body, null, 2));
    } catch (error) {
      console.error("2.3. Erro ao fazer parse do JSON:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body", details: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // Credenciais de produção da Click2Pay conforme exemplos
    const clientId = Deno.env.get("CLICK2PAY_CLIENT_ID") || "a84f96cf-b580-479a-9ecc-d9aa1d85b634124617090002540";
    const clientSecret = Deno.env.get("CLICK2PAY_CLIENT_SECRET") || "260ac62f63720b4803ef5793df23605b";

    console.log("3. Verificando variáveis de ambiente...");
    console.log("- SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
    console.log("- SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");
    console.log("- CLICK2PAY_CLIENT_ID:", clientId ? "✓" : "✗");
    console.log("- CLICK2PAY_CLIENT_SECRET:", clientSecret ? "✓" : "✗");

    if (!supabaseUrl || !supabaseServiceKey || !clientId || !clientSecret) {
      throw new Error("Variáveis de ambiente não configuradas");
    }

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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('branch_id, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error("Erro ao buscar profile:", profileError);
      throw new Error(`Erro ao buscar profile do usuário: ${profileError.message}`);
    }

    if (!profile || !profile.branch_id) {
      console.error("Profile não encontrado para o usuário:", userId);
      throw new Error("Usuário não possui branch_id válido");
    }

    console.log("8.2. Branch ID encontrado:", profile.branch_id);

    // Valor fixo para teste
    const totalAmount = 35.00;
    console.log("10. Valor total fixo:", totalAmount);
    
    const mockCartItems = [{
       item_id: '7521a6bc-c90a-4514-9e5d-67f10e65f680',
       quantity: 1,
       price: 35.00,
       item_type: 'product'
     }];

    // Criar ordem no banco
    console.log("12. Criando ordem no banco...");
    const orderData = {
      user_id: userId,
      branch_id: profile.branch_id,
      total_amount: totalAmount,
      status: 'in_process',
      payment_method: paymentMethod
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error("Erro ao criar ordem:", orderError);
      throw new Error(`Erro ao criar ordem: ${orderError.message}`);
    }

    console.log("13. Ordem criada:", order.id);

    // Criar itens da ordem
    const orderItems = mockCartItems.map((item: any) => ({
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

    // Preparar dados para Click2Pay seguindo EXATAMENTE os exemplos
    console.log("15. Preparando dados para Click2Pay...");
    
    const customer = prepareCustomerData(paymentData, userData.user.email);
    console.log("15.1. Dados do cliente preparados:", JSON.stringify(customer, null, 2));
    
    let click2payResult: any;
    const shortOrderId = order.id.substring(0, 32);
    
    switch (paymentMethod) {
      case "boleto":
        console.log("15.1. Configurando dados para boleto seguindo exemplo oficial...");
        
        // Estrutura EXATA do exemplo oficial fornecido
        const boletoData = {
          payerInfo: {
            address: {
              place: customer.payerInfo.address.place,
              number: customer.payerInfo.address.number,
              complement: customer.payerInfo.address.complement,
              neighborhood: customer.payerInfo.address.neighborhood,
              city: customer.payerInfo.address.city,
              state: customer.payerInfo.address.state,
              zipcode: customer.payerInfo.address.zipcode
            },
            name: customer.payerInfo.name,
            taxid: customer.payerInfo.taxid,
            phonenumber: customer.payerInfo.phonenumber,
            email: customer.payerInfo.email,
            birth_date: customer.payerInfo.birth_date
          },
          payment_limit_days: 3,
          fine: { mode: 'FIXED' },
          interest: { mode: 'DAILY_AMOUNT' },
          totalAmount: totalAmount,
          id: shortOrderId,
          callbackAddress: `${Deno.env.get('SUPABASE_URL')}/functions/v1/click2pay-webhook`
        };
        
        console.log("15.2. Dados do boleto preparados:", JSON.stringify(boletoData, null, 2));
        
        click2payResult = await makeClick2PayRequest('/v1/transactions/boleto', boletoData, clientId, clientSecret);
        break;

      case "pix":
        console.log("15.1. Configurando dados para PIX seguindo exemplo oficial...");
        
        // Estrutura EXATA do exemplo oficial fornecido
        const pixData = {
          id: shortOrderId,
          totalAmount: totalAmount,
          payerInfo: {
            name: customer.payerInfo.name,
            taxid: customer.payerInfo.taxid,
            phonenumber: customer.payerInfo.phonenumber,
            email: customer.payerInfo.email
          },
          expiration: 86400, // 24 horas como no exemplo
          callbackAddress: `${Deno.env.get('SUPABASE_URL')}/functions/v1/click2pay-webhook`,
          returnQRCode: true // Sempre retornar QR Code
        };
        
        console.log("15.2. Dados do PIX preparados:", JSON.stringify(pixData, null, 2));
        
        click2payResult = await makeClick2PayRequest('/v1/transactions/pix', pixData, clientId, clientSecret);
        break;

      case "cartao":
        console.log("15.1. Configurando dados para cartão seguindo exemplo oficial...");
        
        // Estrutura EXATA do exemplo oficial fornecido
        const cardData = {
          payerInfo: {
            name: customer.payerInfo.name,
            taxid: customer.payerInfo.taxid
          },
          capture: true,
          saveCard: false,
          recurrent: false,
          id: shortOrderId,
          totalAmount: totalAmount,
          cardHash: paymentData.card_hash
        };
        
        console.log("15.2. Dados do cartão preparados:", JSON.stringify(cardData, null, 2));
        
        click2payResult = await makeClick2PayRequest('/v1/transactions/creditcard', cardData, clientId, clientSecret);
        break;

      default:
        throw new Error(`Método de pagamento não suportado: ${paymentMethod}`);
    }

    console.log("16. Resultado Click2Pay:", JSON.stringify(click2payResult, null, 2));

    // Atualizar ordem com dados da Click2Pay - CAPTURAR CAMPOS ESSENCIAIS
    console.log("21. Atualizando ordem com dados essenciais da Click2Pay...");
    
    let expiresAt: string | null = null;
    if (paymentMethod === 'pix') {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else if (paymentMethod === 'boleto') {
      expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    }

    // CAPTURAR DADOS ESSENCIAIS conforme problema 1
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        click2pay_tid: click2payResult.tid || click2payResult.data?.tid,
        status: click2payResult.status || click2payResult.data?.status || 'in_process',
        external_identifier: click2payResult.externalIdentifier || click2payResult.data?.externalIdentifier || order.id,
        expires_at: expiresAt,
        click2pay_response: click2payResult // Salvar resposta completa para debug
      })
      .eq('id', order.id);

    if (updateError) {
      console.error("Erro ao atualizar ordem:", updateError);
    }

    // Salvar detalhes do pagamento - CAPTURAR CAMPOS ESPECÍFICOS POR MÉTODO
    console.log("22. Salvando detalhes específicos do pagamento...");
    let paymentDetailsData: any = {
      order_id: order.id,
      payment_method: paymentMethod
    };

    if (paymentMethod === 'pix') {
      // CAPTURAR DADOS ESPECÍFICOS DO PIX conforme problema 1
      paymentDetailsData = {
        ...paymentDetailsData,
        pix_code: click2payResult.textPayment || click2payResult.data?.textPayment,
        pix_qr_code: click2payResult.qrCodeImage?.base64 || click2payResult.data?.qrCodeImage?.base64,
        pix_expiration: expiresAt
      };
    } else if (paymentMethod === 'boleto') {
      // CAPTURAR DADOS ESPECÍFICOS DO BOLETO conforme problema 1
      paymentDetailsData = {
        ...paymentDetailsData,
        boleto_url: click2payResult.boleto?.url || click2payResult.data?.boleto?.url,
        boleto_barcode: click2payResult.boleto?.barcode || click2payResult.data?.boleto?.barcode,
        boleto_due_date: click2payResult.boleto?.due_date || click2payResult.data?.boleto?.due_date
      };
    } else if (paymentMethod === 'cartao') {
      paymentDetailsData = {
        ...paymentDetailsData,
        card_transaction_id: click2payResult.tid || click2payResult.data?.tid,
        card_authorization_code: click2payResult.authorizationCode || click2payResult.data?.authorizationCode
      };
    }

    const { error: paymentDetailsError } = await supabase
      .from('payment_details')
      .insert(paymentDetailsData);

    if (paymentDetailsError) {
      console.error("23. Erro ao salvar detalhes do pagamento:", paymentDetailsError);
    }

    // Confirmar pagamento se já estiver pago
    if (click2payResult.status === 'paid') {
      console.log("24. Pagamento confirmado automaticamente - atualizando status da ordem...");
      const { error: confirmError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order.id);

      if (confirmError) {
        console.error("Erro ao confirmar pagamento:", confirmError);
      }
    }

    console.log("25. Processamento concluído com sucesso");

    // Preparar resposta baseada no método de pagamento
    let response: any = {
      success: true,
      orderId: order.id,
      status: click2payResult.status || click2payResult.data?.status,
      paymentMethod,
      tid: click2payResult.tid || click2payResult.data?.tid
    };

    // Adicionar dados específicos do método de pagamento para as páginas de instrução
    switch (paymentMethod) {
      case "boleto":
        response.boleto = {
          url: click2payResult.boleto?.url || click2payResult.data?.boleto?.url,
          barcode: click2payResult.boleto?.barcode || click2payResult.data?.boleto?.barcode,
          due_date: click2payResult.boleto?.due_date || click2payResult.data?.boleto?.due_date
        };
        break;

      case "pix":
        response.pix = {
          qr_code: click2payResult.textPayment || click2payResult.data?.textPayment,
          qr_code_image: click2payResult.qrCodeImage?.base64 || click2payResult.data?.qrCodeImage?.base64,
          expires_at: expiresAt
        };
        break;

      case "cartao":
        response.card = {
          authorization_code: click2payResult.authorizationCode || click2payResult.data?.authorizationCode,
          captured: click2payResult.captured || click2payResult.data?.captured
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
    console.error("=== ERRO CAPTURADO NO EDGE FUNCTION ===");
    console.error("Tipo do erro:", typeof error);
    console.error("Constructor:", error?.constructor?.name);
    console.error("Mensagem:", error?.message);
    console.error("Stack trace:", error?.stack);
    console.error("Error object completo:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    const errorMessage = error?.message || error?.toString() || "Erro desconhecido";
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorType: error?.constructor?.name || typeof error,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
