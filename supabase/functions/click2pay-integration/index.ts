import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URLs da API Click2Pay - usando API de produção
const CLICK2PAY_BASE_URL = "https://api.click2pay.com.br";

// Função para fazer requisições HTTP para Click2Pay
async function makeClick2PayRequest(endpoint: string, data: any, clientId: string, clientSecret: string) {
  const response = await fetch(`${CLICK2PAY_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': createBasicAuth(clientId, clientSecret)
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Click2Pay API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Função para validar CPF
function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  
  // Verificar se tem 11 dígitos
  if (cpf.length !== 11) {
    return false;
  }
  
  // Verificar se não são todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  
  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  let digit1 = (remainder >= 10) ? 0 : remainder;
  
  // Verificar primeiro dígito
  if (parseInt(cpf.charAt(9)) !== digit1) {
    return false;
  }
  
  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  let digit2 = (remainder >= 10) ? 0 : remainder;
  
  // Verificar segundo dígito
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

  // Validações específicas por método
  if (paymentMethod === "cartao") {
    if (!paymentData.card_hash?.trim()) {
      errors.push("Hash do cartão é obrigatório");
    }
  }
  
  return errors;
}

// Função para criar autenticação Basic Auth
function createBasicAuth(clientId: string, clientSecret: string): string {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

// Função para implementar retry com backoff exponencial
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Se não é erro 503 ou é a última tentativa, não retry
      if (!error.message.includes('503') || attempt === maxRetries) {
        throw error;
      }
      
      // Calcular delay com backoff exponencial
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Tentativa ${attempt + 1} falhou com erro 503, tentando novamente em ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Função removida - checkPixApiHealth causava erro 401 com endpoint inexistente

// Função para preparar dados do cliente
function prepareCustomerData(paymentData: any, userEmail: string) {
  // Validar se paymentData existe
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
      birth_date: paymentData.dataNascimento || ""
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
    
    // Ler body
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
    // Credenciais de produção da Click2Pay
    const clientId = Deno.env.get("CLICK2PAY_CLIENT_ID") || "a84f96cf-b580-479a-9ecc-d9aa1d85b634124617090002540";
    const clientSecret = Deno.env.get("CLICK2PAY_CLIENT_SECRET") || "260ac62f63720b4803ef5793df23605b";

    console.log("3. Verificando variáveis de ambiente...");
    console.log("- SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
    console.log("- SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");
    console.log("- CLICK2PAY_CLIENT_ID:", clientId ? "✓" : "✗");
    console.log("- CLICK2PAY_CLIENT_SECRET:", clientSecret ? "✓" : "✗");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("ERRO: Variáveis do Supabase não configuradas");
      console.error("SUPABASE_URL:", supabaseUrl);
      console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "[PRESENTE]" : "[AUSENTE]");
      throw new Error("Variáveis do Supabase não configuradas");
    }

    if (!clientId || !clientSecret) {
      console.error("ERRO: Credenciais da Click2Pay não configuradas");
      console.error("CLICK2PAY_CLIENT_ID:", clientId);
      console.error("CLICK2PAY_CLIENT_SECRET:", clientSecret ? "[PRESENTE]" : "[AUSENTE]");
      throw new Error("Credenciais da Click2Pay não configuradas");
    }

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
    console.log("8.1.1. UserID para busca:", userId);
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('branch_id, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();

    console.log("8.1.2. Resultado da query profile:", { profile, profileError });

    if (profileError) {
      console.error("Erro ao buscar profile:", profileError);
      throw new Error(`Erro ao buscar profile do usuário: ${profileError.message}`);
    }

    if (!profile) {
      console.error("Profile não encontrado para o usuário:", userId);
      throw new Error("Profile do usuário não encontrado");
    }

    if (!profile.branch_id) {
      console.error("Branch ID não encontrado no profile:", profile);
      throw new Error("Usuário não possui branch_id válido");
    }

    console.log("8.2. Branch ID encontrado:", profile.branch_id);
    console.log("8.3. Dados completos do profile:", profile);

    // Verificar e habilitar configurações de pagamento automaticamente
    console.log("8.4. Verificando configurações de pagamento...");
    let { data: paymentSettings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('branch_id', profile.branch_id)
      .maybeSingle();

    if (settingsError) {
      console.error("Erro ao buscar configurações de pagamento:", settingsError);
      throw new Error(`Erro ao buscar configurações de pagamento: ${settingsError.message}`);
    }

    // Se não existem configurações, criar com Click2Pay habilitado
    if (!paymentSettings) {
      console.log("8.4.1. Criando configurações de pagamento para branch_id:", profile.branch_id);
      const { data: newSettings, error: createError } = await supabase
        .from('payment_settings')
        .insert({
          branch_id: profile.branch_id,
          click2pay_enabled: true,
          click2pay_api_url: 'https://api.click2pay.com.br',
          pix_enabled: true,
          boleto_enabled: true,
          cartao_enabled: true
        })
        .select()
        .single();

      if (createError) {
        console.error("Erro ao criar configurações de pagamento:", createError);
        throw new Error(`Erro ao criar configurações de pagamento: ${createError.message}`);
      }
      
      paymentSettings = newSettings;
      console.log("8.4.2. Configurações criadas:", paymentSettings);
    }
    // Se existem configurações mas Click2Pay está desabilitado, habilitar automaticamente
    else if (!paymentSettings.click2pay_enabled) {
      console.log("8.4.3. Habilitando Click2Pay automaticamente para branch_id:", profile.branch_id);
      const { data: updatedSettings, error: updateError } = await supabase
        .from('payment_settings')
        .update({
          click2pay_enabled: true,
          click2pay_api_url: 'https://api.click2pay.com.br'
        })
        .eq('branch_id', profile.branch_id)
        .select()
        .single();

      if (updateError) {
        console.error("Erro ao atualizar configurações de pagamento:", updateError);
        throw new Error(`Erro ao atualizar configurações de pagamento: ${updateError.message}`);
      }
      
      paymentSettings = updatedSettings;
      console.log("8.4.4. Configurações atualizadas:", paymentSettings);
    }

    console.log("8.5. Configurações de pagamento finais:", paymentSettings);

    // Usar valor fixo para teste (removendo dependência do carrinho)
    console.log("9. Usando valor fixo para pagamento...");
    
    // Valor fixo para teste - não depende mais do carrinho
    const totalAmount = 35.00;
    console.log("10. Valor total fixo:", totalAmount);
    
    // Itens fictícios para a ordem (não dependem do carrinho real)
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
    console.log("12.1. Dados da ordem:", orderData);

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
    console.log("14. Criando itens da ordem...");
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

    // Preparar dados para Click2Pay
    console.log("15. Preparando dados para Click2Pay...");
    
    // Dados do cliente
    const customer = prepareCustomerData(paymentData, userData.user.email);
    console.log("15.1. Dados do cliente preparados:", JSON.stringify(customer, null, 2));
    
    let click2payResult: any;
    
    // Usar apenas os primeiros 32 caracteres do order.id para não exceder 36 caracteres
    const shortOrderId = order.id.substring(0, 32);
    
    switch (paymentMethod) {
      case "boleto":
        console.log("15.1. Configurando dados para boleto...");
        
        // Preparar dados conforme exemplo oficial da Click2Pay
        const boletoData = {
          totalAmount: totalAmount,
          id: shortOrderId,
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 dias a partir de hoje
          payment_limit_days: 3,
          instructions: ['Pagamento referente ao pedido', `Pedido #${order.id}`, 'Não aceitar após o vencimento'],
          fine: {
            start: 0,
            mode: 'FIXED',
            value: 1
          },
          interest: {
            start: 2,
            mode: 'MONTHLY_PERCENTAGE',
            value: 9
          },
          discount_mode: 'PERCENTAGE',
          discount: [
            { days_before: 5, value: 1.2 },
            { days_before: 2, value: 12 }
          ],
          description: `Pagamento do pedido #${order.id}`,
          payerInfo: customer.payerInfo,
          callbackAddress: `${Deno.env.get('SUPABASE_URL')}/functions/v1/click2pay-webhook`,
          logo: 'https://logosrated.net/wp-content/uploads/parser/Teste-Logo-1.gif'
        };
        
        console.log("15.2. Dados do boleto preparados:", JSON.stringify(boletoData, null, 2));
        
        // Chamar API Click2Pay diretamente
        click2payResult = await makeClick2PayRequest('/v1/transactions/boleto', boletoData, clientId, clientSecret);
        break;

      case "pix":
        console.log("15.1. Configurando dados para PIX...");
        const pixData = {
          id: shortOrderId,
          totalAmount: totalAmount,
          expiration: "86400", // 24 horas
          returnQRCode: true,
          payerInfo: customer.payerInfo
        };
        
        console.log("15.2. Dados do PIX preparados:", JSON.stringify(pixData, null, 2));
        
        // Chamar API Click2Pay diretamente
        click2payResult = await makeClick2PayRequest('/v1/transactions/pix', pixData, clientId, clientSecret);
        break;

      case "cartao":
        console.log("15.1. Configurando dados para cartão...");
        const cardData = {
          id: shortOrderId,
          totalAmount: totalAmount,
          cardHash: paymentData.card_hash,
          installments: paymentData.parcelas || 1,
          capture: true,
          saveCard: false,
          recurrent: false,
          payerInfo: customer.payerInfo
        };
        
        console.log("15.2. Dados do cartão preparados:", JSON.stringify(cardData, null, 2));
        
        // Chamar API Click2Pay diretamente
        click2payResult = await makeClick2PayRequest('/v1/transactions/creditcard', cardData, clientId, clientSecret);
        break;

      default:
        throw new Error(`Método de pagamento não suportado: ${paymentMethod}`);
    }

    console.log("16. Resultado Click2Pay:", JSON.stringify(click2payResult, null, 2));

    // Atualizar ordem com dados da Click2Pay
    console.log("21. Atualizando ordem com dados da Click2Pay...");
    
    // Calcular data de expiração baseada no método de pagamento
    let expiresAt: string | null = null;
    if (paymentMethod === 'pix') {
      // PIX expira em 24 horas
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else if (paymentMethod === 'boleto') {
      // Boleto expira em 3 dias
      expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        click2pay_tid: click2payResult.data?.tid || click2payResult.tid || click2payResult.id,
        status: click2payResult.data?.status || click2payResult.status || 'in_process',
        external_identifier: click2payResult.data?.externalIdentifier || click2payResult.external_identifier || order.id,
        expires_at: expiresAt
      })
      .eq('id', order.id);

    if (updateError) {
      console.error("Erro ao atualizar ordem:", updateError);
      // Não falhar aqui, apenas logar
    }

    // Salvar detalhes do pagamento
    console.log("22. Salvando detalhes do pagamento...");
    let paymentDetailsData: any = {
      order_id: order.id,
      payment_method: paymentMethod
    };

    if (paymentMethod === 'pix') {
      paymentDetailsData = {
        ...paymentDetailsData,
        pix_code: click2payResult.data?.pix?.code || click2payResult.pix?.code || null,
        pix_qr_code: click2payResult.data?.pix?.qrCode || click2payResult.pix?.qr_code || null,
        pix_expiration: expiresAt
      };
    } else if (paymentMethod === 'boleto') {
      paymentDetailsData = {
        ...paymentDetailsData,
        boleto_url: click2payResult.data?.boleto?.url || click2payResult.boleto?.url || null,
        boleto_barcode: click2payResult.data?.boleto?.barcode || click2payResult.boleto?.barcode || null,
        boleto_due_date: click2payResult.data?.boleto?.due_date || click2payResult.boleto?.due_date || null
      };
    } else if (paymentMethod === 'cartao') {
      paymentDetailsData = {
        ...paymentDetailsData,
        card_transaction_id: click2payResult.data?.tid || click2payResult.tid || null,
        card_authorization_code: click2payResult.data?.authorizationCode || click2payResult.authorization_code || null
      };
    }

    const { error: paymentDetailsError } = await supabase
      .from('payment_details')
      .insert(paymentDetailsData);

    if (paymentDetailsError) {
      console.error("23. Erro ao salvar detalhes do pagamento:", paymentDetailsError);
      // Não falha a operação, apenas loga o erro
    }

    // Confirmar pagamento se já estiver pago (PIX instantâneo, por exemplo)
    if (click2payResult.status === 'paid') {
      console.log("22. Pagamento confirmado automaticamente - atualizando status da ordem...");
      const { error: confirmError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order.id);

      if (confirmError) {
        console.error("Erro ao confirmar pagamento:", confirmError);
      }
    }

    console.log("23. Processamento concluído com sucesso");

    // Preparar resposta baseada no método de pagamento
    let response: any = {
      success: true,
      orderId: order.id,
      status: click2payResult.status,
      paymentMethod,
      tid: click2payResult.tid || click2payResult.id
    };

    // Adicionar dados específicos do método de pagamento
    switch (paymentMethod) {
      case "boleto":
        response.boleto = {
          url: click2payResult.boleto_url,
          barcode: click2payResult.barcode,
          due_date: click2payResult.due_date
        };
        break;

      case "pix":
        response.pix = {
          qr_code: click2payResult.data?.pix?.code || click2payResult.pix?.code || click2payResult.code,
          qr_code_image: click2payResult.data?.pix?.qrCode || click2payResult.pix?.qrCode || click2payResult.qrCode,
          expires_at: expiresAt
        };
        break;

      case "cartao":
        response.card = {
          authorization_code: click2payResult.authorization_code,
          captured: click2payResult.captured
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
    
    // Log adicional para debug
    console.error("=== INFORMAÇÕES ADICIONAIS DE DEBUG ===");
    console.error("Request method:", req.method);
    console.error("Request URL:", req.url);
    console.error("Timestamp:", new Date().toISOString());
    
    const errorMessage = error?.message || error?.toString() || "Erro desconhecido";
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorType: error?.constructor?.name || typeof error,
        timestamp: new Date().toISOString(),
        debug: {
          method: req.method,
          url: req.url
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});