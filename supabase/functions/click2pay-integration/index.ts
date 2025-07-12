import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URLs da API Click2Pay
const CLICK2PAY_BASE_URL = "https://apisandbox.click2pay.com.br";

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

// Função para criar autenticação Basic Auth
function createBasicAuth(clientId: string, clientSecret: string): string {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

// Função para preparar dados do cliente
function prepareCustomerData(paymentData: any, userEmail: string) {
  return {
    payerInfo: {
      address: {
        place: paymentData.endereco || "",
        number: paymentData.numero || "",
        complement: paymentData.complemento || "",
        neighborhood: paymentData.bairro || "",
        city: paymentData.cidade || "",
        state: paymentData.estado || "",
        zipcode: paymentData.cep?.replace(/[^\d]/g, '') || ""
      },
      name: paymentData.nomeCompleto.trim(),
      taxid: paymentData.cpfCnpj.replace(/[^\d]/g, ''),
      phonenumber: paymentData.telefone.replace(/[^\d]/g, ''),
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
    const customer = prepareCustomerData(paymentData, userData.user.email);
    console.log("15.1. Dados do cliente preparados:", JSON.stringify(customer, null, 2));
    
    // Determinar endpoint e dados específicos por método
    let endpoint = "";
    let payloadData: any = {
      id: order.id,
      totalAmount: totalAmount,
      ...customer
    };

    switch (paymentMethod) {
      case "boleto":
        console.log("15.1. Configurando dados para boleto...");
        endpoint = `${CLICK2PAY_BASE_URL}/v1/transactions/boleto`;
        payloadData = {
          ...payloadData,
          payment_limit_days: 3,
          fine: { mode: 'FIXED' },
          interest: { mode: 'DAILY_AMOUNT' }
        };
        console.log("15.2. Payload boleto configurado:", JSON.stringify(payloadData, null, 2));
        break;

      case "pix":
        endpoint = `${CLICK2PAY_BASE_URL}/v1/transactions/pix`;
        payloadData = {
          ...payloadData,
          expiration: "86400", // 24 horas
          returnQRCode: true
        };
        break;

      case "cartao":
        endpoint = `${CLICK2PAY_BASE_URL}/v1/transactions/creditcard`;
        payloadData = {
          ...payloadData,
          card_hash: paymentData.card_hash,
          installments: paymentData.parcelas || 1,
          capture: true,
          saveCard: false,
          recurrent: false
        };
        break;

      default:
        throw new Error(`Método de pagamento não suportado: ${paymentMethod}`);
    }

    console.log("16. Endpoint:", endpoint);
    console.log("17. Payload:", JSON.stringify(payloadData, null, 2));

    // Chamar API da Click2Pay com autenticação Basic Auth
    const authHeader = createBasicAuth(clientId, clientSecret);
    console.log("18. Chamando Click2Pay API...");
    console.log("18.1. Endpoint:", endpoint);
    console.log("18.2. Auth header:", authHeader.substring(0, 20) + "...");
    
    const click2payResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payloadData)
    });

    console.log("19. Status da resposta Click2Pay:", click2payResponse.status);
    console.log("19.1. Headers da resposta:", Object.fromEntries(click2payResponse.headers.entries()));
    
    const click2payResult = await click2payResponse.json();
    console.log("20. Resposta Click2Pay:", JSON.stringify(click2payResult, null, 2));

    if (!click2payResponse.ok) {
      const errorMessage = click2payResult.message || click2payResult.error || click2payResult.errors || 'Erro desconhecido na API';
      console.error("21. Erro da API Click2Pay:");
      console.error("21.1. Status:", click2payResponse.status);
      console.error("21.2. Mensagem:", errorMessage);
      console.error("21.3. Resposta completa:", JSON.stringify(click2payResult, null, 2));
      throw new Error(`Click2Pay API error: ${errorMessage}`);
    }

    // Atualizar ordem com dados da Click2Pay
    console.log("21. Atualizando ordem com dados da Click2Pay...");
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        click2pay_tid: click2payResult.tid || click2payResult.id,
        status: click2payResult.status || 'in_process',
        external_identifier: click2payResult.external_identifier || order.id
      })
      .eq('id', order.id);

    if (updateError) {
      console.error("Erro ao atualizar ordem:", updateError);
      // Não falhar aqui, apenas logar
    }

    // Confirmar pagamento se já estiver pago (PIX instantâneo, por exemplo)
    if (click2payResult.status === 'paid') {
      console.log("22. Confirmando pagamento do carrinho...");
      const { error: confirmError } = await supabase
        .rpc('confirm_cart_payment', { 
          p_user_id: userId, 
          p_order_id: order.id 
        });

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
          qr_code: click2payResult.qr_code,
          qr_code_url: click2payResult.qr_code_url,
          expires_at: click2payResult.expires_at
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