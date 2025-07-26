import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URLs da API Click2Pay - usando API de produção
const CLICK2PAY_BASE_URL = "https://api.click2pay.com.br";

// Função para tokenizar cartão de crédito
// Função removida - tokenização agora é feita no frontend

// Função para fazer requisições HTTP para Click2Pay
async function makeClick2PayRequest(endpoint: string, data: any, clientId: string, clientSecret: string) {
  console.log(`=== INICIANDO REQUISIÇÃO PARA CLICK2PAY ===`);
  console.log("Endpoint:", endpoint);
  console.log("URL completa:", `${CLICK2PAY_BASE_URL}${endpoint}`);
  console.log("ClientId:", clientId ? "PRESENTE" : "AUSENTE");
  console.log("ClientSecret:", clientSecret ? "PRESENTE" : "AUSENTE");
  console.log("Dados enviados:", JSON.stringify(data, null, 2));
  
  try {
    const response = await fetch(`${CLICK2PAY_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': createBasicAuth(clientId, clientSecret)
      },
      body: JSON.stringify(data)
    });

    console.log("Status da resposta:", response.status);
    console.log("Headers da resposta:", Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log("Resposta raw da Click2Pay:", responseText);

    if (!response.ok) {
      console.error("=== ERRO NA API CLICK2PAY ===");
      console.error("Status:", response.status);
      console.error("Status Text:", response.statusText);
      console.error("Response:", responseText);
      throw new Error(`Click2Pay API Error: ${response.status} - ${responseText}`);
    }

    const responseJson = JSON.parse(responseText);
    console.log("Resposta JSON parseada:", JSON.stringify(responseJson, null, 2));
    return responseJson;
  } catch (error) {
    console.error("=== ERRO CAPTURADO EM makeClick2PayRequest ===");
    console.error("Erro:", error);
    throw error;
  }
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

// Função para buscar itens do carrinho do usuário
async function getCartItems(supabase: any, userId: string) {
  console.log("Buscando itens do carrinho para usuário:", userId);
  
  const { data: cartItems, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

  if (error) {
    console.error("Erro ao buscar itens do carrinho:", error);
    throw new Error(`Erro ao buscar itens do carrinho: ${error.message}`);
  }

  console.log("Itens do carrinho encontrados:", cartItems?.length || 0);
  console.log("Detalhes dos itens:", JSON.stringify(cartItems, null, 2));
  return cartItems || [];
}

// Função para calcular o total do carrinho
function calculateCartTotal(cartItems: any[]): number {
  const total = cartItems.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  console.log("Total do carrinho calculado:", total);
  return total;
}

// Função para aplicar desconto de cupom
function applyDiscount(cartTotal: number, couponData: any): { finalTotal: number, discountAmount: number } {
  if (!couponData) {
    return { finalTotal: cartTotal, discountAmount: 0 };
  }

  const discountAmount = couponData.discountAmount || 0;
  const finalTotal = Math.max(0, cartTotal - discountAmount);
  
  console.log("Desconto aplicado:", discountAmount);
  console.log("Total final após desconto:", finalTotal);
  
  return { finalTotal, discountAmount };
}

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

// Função para capturar pagamento com cartão de crédito
async function capturePayment(tid: string, totalAmount: number, clientId: string, clientSecret: string): Promise<any> {
  console.log(`Iniciando captura para TID: ${tid}, valor: ${totalAmount}`);
  
  const captureData = {
    totalAmount: totalAmount
  };
  
  try {
    const response = await fetch(`${CLICK2PAY_BASE_URL}/v1/transactions/creditcard/${tid}/capture`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': createBasicAuth(clientId, clientSecret)
      },
      body: JSON.stringify(captureData)
    });

    const responseText = await response.text();
    console.log("Resposta da captura (raw):", responseText);

    if (!response.ok) {
      console.error("Erro na captura - Status:", response.status);
      return { success: false, error: `Erro HTTP ${response.status}: ${responseText}` };
    }

    const result = JSON.parse(responseText);
    console.log("Resposta da captura (parsed):", JSON.stringify(result, null, 2));
    
    return { success: true, data: result };
  } catch (error) {
    console.error("Erro na captura:", error);
    return { success: false, error: error.message };
  }
}

// Função para salvar dados de pagamento na tabela payment_details
async function savePaymentDetails(supabase: any, orderId: string, paymentMethod: string, click2payResult: any) {
  console.log("Salvando dados de pagamento para pedido:", orderId);
  
  const paymentDetailsData: any = {
    order_id: orderId,
    payment_method: paymentMethod
  };

  if (paymentMethod === 'pix' && click2payResult.pix) {
    paymentDetailsData.pix_code = click2payResult.pix.qr_code;
    paymentDetailsData.pix_qr_code = click2payResult.pix.qr_code_image;
    paymentDetailsData.pix_expiration = click2payResult.pix.expires_at;
  } else if (paymentMethod === 'boleto' && click2payResult.boleto) {
    paymentDetailsData.boleto_url = click2payResult.boleto.url;
    paymentDetailsData.boleto_barcode = click2payResult.boleto.barcode;
    paymentDetailsData.boleto_due_date = click2payResult.boleto.due_date;
  } else if (paymentMethod === 'card' && click2payResult.card) {
    paymentDetailsData.card_transaction_id = click2payResult.card.transaction_id;
    paymentDetailsData.card_authorization_code = click2payResult.card.authorization_code;
  }

  const { error } = await supabase
    .from('payment_details')
    .insert(paymentDetailsData);

  if (error) {
    console.error("Erro ao salvar payment_details:", error);
    throw new Error(`Erro ao salvar detalhes do pagamento: ${error.message}`);
  }

  console.log("Dados de pagamento salvos com sucesso");
}

serve(async (req) => {
  try {
    console.log("=== CLICK2PAY INTEGRATION INICIADO ===");
    const { method } = req;
    console.log("Method:", method);
    console.log("URL:", req.url);

    const CLICK2PAY_CLIENT_ID = Deno.env.get("CLICK2PAY_CLIENT_ID");
    const CLICK2PAY_CLIENT_SECRET = Deno.env.get("CLICK2PAY_CLIENT_SECRET");

    console.log('CLICK2PAY_CLIENT_ID:', CLICK2PAY_CLIENT_ID ? 'DEFINED' : 'UNDEFINED');
    console.log('CLICK2PAY_CLIENT_SECRET:', CLICK2PAY_CLIENT_SECRET ? 'DEFINED' : 'UNDEFINED');

    if (!CLICK2PAY_CLIENT_ID || !CLICK2PAY_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "Variáveis de ambiente CLICK2PAY_CLIENT_ID ou CLICK2PAY_CLIENT_SECRET não definidas." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Handle CORS preflight request
    if (req.method === "OPTIONS") {
      console.log("Requisição OPTIONS - retornando CORS");
      return new Response(null, { headers: corsHeaders });
    }

    console.log("1. Processando requisição...");
    
    // Ler body
    let body;
    try {
      const text = await req.text();
      console.log("2.1. Text recebido (raw):", text);
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
    const clientId = Deno.env.get("CLICK2PAY_CLIENT_ID");
    const clientSecret = Deno.env.get("CLICK2PAY_CLIENT_SECRET");

    console.log("3. Verificando variáveis de ambiente...");
    console.log("- SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
    console.log("- SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");
    console.log("- CLICK2PAY_CLIENT_ID:", clientId ? "✓" : "✗");
    console.log("- CLICK2PAY_CLIENT_SECRET:", clientSecret ? "✓" : "✗");

    // Extrair dados do corpo da requisição
    const { action, userId, paymentMethod, paymentData, couponData } = body;
    console.log("3.1. Parâmetros extraídos:", { action, userId, paymentMethod });

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: "Ação não especificada no corpo da requisição." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("ERRO: Variáveis do Supabase não configuradas");
      throw new Error("Variáveis do Supabase não configuradas");
    }

    if (!clientId || !clientSecret) {
      console.error("ERRO: Credenciais da Click2Pay não configuradas");
      throw new Error("Credenciais da Click2Pay não configuradas");
    }

    // Criar cliente Supabase
    console.log("4. Criando cliente Supabase...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("5. Validando parâmetros extraídos:", { action, userId, paymentMethod });

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
      .select('branch_id, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error("Erro ao buscar profile:", profileError);
      throw new Error(`Erro ao buscar profile do usuário: ${profileError.message}`);
    }

    if (!profile || !profile.branch_id) {
      throw new Error("Usuário não possui branch_id válido");
    }

    console.log("8.2. Branch ID encontrado:", profile.branch_id);

    // Buscar itens do carrinho do usuário
    console.log("9. Buscando itens do carrinho...");
    const cartItems = await getCartItems(supabase, userId);
    
    if (!cartItems || cartItems.length === 0) {
      throw new Error("Carrinho vazio - não é possível prosseguir com o pagamento");
    }

    // Calcular total do carrinho
    console.log("10. Calculando total do carrinho...");
    const cartTotal = calculateCartTotal(cartItems);
    
    if (cartTotal <= 0) {
      throw new Error("Valor do carrinho inválido");
    }

    // Aplicar desconto se houver cupom
    console.log("11. Aplicando desconto...");
    const { finalTotal, discountAmount } = applyDiscount(cartTotal, couponData);
    
    console.log("12. Valor final calculado:", finalTotal);

    // Criar ordem no banco
    console.log("13. Criando ordem no banco...");
    const orderData = {
      user_id: userId,
      branch_id: profile.branch_id,
      total_amount: finalTotal,
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

    console.log("14. Ordem criada:", order.id);

    // Separar itens de produto dos itens de reserva
    console.log("15. Separando itens de produto e reserva...");
    const productItems = cartItems.filter(item => item.item_type === 'product');
    const reservationItems = cartItems.filter(item => item.item_type === 'room' || item.item_type === 'equipment');

    console.log("15.1. Itens de produto:", productItems.length);
    console.log("15.2. Itens de reserva:", reservationItems.length);

    // Criar order_items apenas para produtos
    if (productItems.length > 0) {
      console.log("16. Criando order_items para produtos...");
      const orderItems = productItems.map((item: any) => ({
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
    }

    // Para reservas, elas já existem como bookings/booking_equipment
    // Apenas atualizar o status conforme necessário
    console.log("17. Processando reservas...");
    for (const item of reservationItems) {
      if (item.item_type === 'room' && item.reserved_booking_id) {
        console.log("17.1. Processando reserva de sala:", item.reserved_booking_id);
        // A reserva já existe, apenas confirmar que está no carrinho
      } else if (item.item_type === 'equipment' && item.reserved_equipment_booking_id) {
        console.log("17.2. Processando reserva de equipamento:", item.reserved_equipment_booking_id);
        // A reserva já existe, apenas confirmar que está no carrinho
      }
    }

    // Preparar dados para Click2Pay
    console.log("18. Preparando dados para Click2Pay...");
    
    // Dados do cliente
    const customer = prepareCustomerData(paymentData, userData.user.email);
    console.log("18.1. Dados do cliente preparados:", JSON.stringify(customer, null, 2));
    
    let click2payResult: any;
    
    // Usar apenas os primeiros 32 caracteres do order.id para não exceder 36 caracteres
    const shortOrderId = order.id.substring(0, 32);
    
    switch (paymentMethod) {
      case "boleto":
        console.log("18.1. Configurando dados para boleto...");
        
        const boletoData = {
          totalAmount: finalTotal,
          id: shortOrderId,
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
        
        console.log("18.2. Dados do boleto preparados:", JSON.stringify(boletoData, null, 2));
        
        click2payResult = await makeClick2PayRequest('/v1/transactions/boleto', boletoData, clientId, clientSecret);
        
        // Mapear resposta do boleto
        if (click2payResult.success && click2payResult.data && click2payResult.data.boleto) {
          click2payResult.boleto = {
            url: click2payResult.data.boleto.url || null,
            barcode: click2payResult.data.boleto.barcode || null,
            due_date: click2payResult.data.boleto.due_date || null
          };
        }
        break;

      case "pix":
        console.log("18.1. Configurando dados para PIX...");
        const pixData = {
          id: shortOrderId,
          totalAmount: finalTotal,
          expiration: "86400",
          returnQRCode: true,
          callbackAddress: `https://fgiidcdsvmqxdkclgety.supabase.co/functions/v1/click2pay-webhook`,
          payerInfo: customer.payerInfo
        };
        
        console.log("18.2. Dados do PIX preparados:", JSON.stringify(pixData, null, 2));
        
        click2payResult = await makeClick2PayRequest('/v1/transactions/pix', pixData, clientId, clientSecret);
        console.log("18.3. Resposta Click2Pay PIX:", JSON.stringify(click2payResult, null, 2));
        
        // Mapear campos do PIX para o formato esperado pelo frontend
        if (click2payResult.success && click2payResult.data && click2payResult.data.pix) {
          console.log("18.4. PIX original da Click2Pay:", JSON.stringify(click2payResult.data.pix, null, 2));
          
          const pixMapped = {
            qr_code: click2payResult.data.pix.textPayment || click2payResult.data.pix.qrCode || click2payResult.data.pix.qr_code || null,
            qr_code_image: click2payResult.data.pix.qrCodeImage?.base64 || click2payResult.data.pix.qrCodeImage || click2payResult.data.pix.qr_code_image || null,
            expires_at: click2payResult.data.pix.expiresAt || click2payResult.data.pix.expires_at || null
          };
          
          console.log("18.5. PIX mapeado:", JSON.stringify(pixMapped, null, 2));
          click2payResult.pix = pixMapped;
        } else {
          console.log("18.4. Estrutura Click2Pay completa:", JSON.stringify(click2payResult, null, 2));
          click2payResult.pix = null;
        }
        break;

      case "cartao":
        console.log("18.1. Processando cartão de crédito com hash do frontend...");
        
        // Validar se o card_hash foi enviado
        if (!paymentData.card_hash) {
          throw new Error("Hash do cartão não foi gerado. Recarregue a página e tente novamente.");
        }
        
        console.log("18.2. Hash do cartão recebido, processando transação...");
        
        const cardData = {
          id: shortOrderId,
          totalAmount: finalTotal,
          capture: true, // Capturar automaticamente
          saveCard: false,
          recurrent: false,
          softDescriptor: 'Sistema de Reservas',
          instalments: paymentData.parcelas || 1,
          cardHash: paymentData.card_hash, // Usar o cardHash gerado no frontend
          payerInfo: {
            name: customer.payerInfo.name,
            taxid: customer.payerInfo.taxid,
            phonenumber: customer.payerInfo.phonenumber,
            email: customer.payerInfo.email,
            birth_date: customer.payerInfo.birth_date || '1990-01-01',
            address: customer.payerInfo.address
          },
          callbackAddress: `https://fgiidcdsvmqxdkclgety.supabase.co/functions/v1/click2pay-webhook`
        };
        
        console.log("18.3. Dados do cartão preparados:", JSON.stringify(cardData, null, 2));
        
        click2payResult = await makeClick2PayRequest('/v1/transactions/creditcard', cardData, clientId, clientSecret);
        console.log("18.3. Resposta Click2Pay Cartão:", JSON.stringify(click2payResult, null, 2));
        
        // Mapear resposta do cartão
        if (click2payResult.success && click2payResult.data) {
          click2payResult.card = {
            transaction_id: click2payResult.data.tid || click2payResult.tid || null,
            authorization_code: click2payResult.data.authorization_code || click2payResult.authorization_code || null
          };
          
          // Com capture: true, a transação já será capturada automaticamente
          if (click2payResult.data.status === 'paid' || click2payResult.data.status === 'approved') {
            click2payResult.status = 'paid';
          } else if (click2payResult.data.status === 'authorized') {
            click2payResult.status = 'authorized';
          } else {
            click2payResult.status = click2payResult.data.status || 'failed';
          }
        }
        break;

      default:
        throw new Error(`Método de pagamento não suportado: ${paymentMethod}`);
    }

    console.log("19. Resultado Click2Pay após mapeamento:", JSON.stringify(click2payResult, null, 2));

    // Salvar resposta da Click2Pay na ordem
    const orderUpdateData: any = {
      click2pay_response: click2payResult,
      click2pay_tid: click2payResult.data?.tid || null,
      external_identifier: click2payResult.data?.externalIdentifier || null
    };
    
    console.log("Salvando dados de pagamento para pedido:", order.id);
    console.log("TID que será salvo:", click2payResult.data?.tid);

    // Definir data de expiração baseada no método de pagamento
    if (paymentMethod === 'pix' && click2payResult.pix && click2payResult.pix.expires_at) {
      orderUpdateData.expires_at = click2payResult.pix.expires_at;
    } else if (paymentMethod === 'boleto' && click2payResult.boleto && click2payResult.boleto.due_date) {
      orderUpdateData.expires_at = new Date(click2payResult.boleto.due_date + 'T23:59:59').toISOString();
    }

    await supabase
      .from('orders')
      .update(orderUpdateData)
      .eq('id', order.id);

    // Salvar detalhes do pagamento na tabela payment_details
    // Mapear "cartao" para "card" para compatibilidade com constraint
    const dbPaymentMethod = paymentMethod === 'cartao' ? 'card' : paymentMethod;
    await savePaymentDetails(supabase, order.id, dbPaymentMethod, click2payResult);

    // Retornar resposta de sucesso com campos mapeados
    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        tid: click2payResult.tid,
        totalAmount: finalTotal,
        status: click2payResult.status,
        pix: click2payResult.pix || null,
        boleto: click2payResult.boleto || null,
        card: click2payResult.card || null,
        message: click2payResult.message || "Transação processada com sucesso"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("=== ERRO CAPTURADO NO EDGE FUNCTION ===");
    console.error("Tipo do erro:", typeof error);
    console.error("Constructor:", error.constructor.name);
    console.error("Mensagem:", error.message);
    console.error("Stack trace:", error.stack);
    console.error("Error object completo:", JSON.stringify(error, null, 2));
    console.error("Request method:", req.method);
    console.error("Request URL:", req.url);
    console.error("Timestamp:", new Date().toISOString());
    console.error("=== INFORMAÇÕES ADICIONAIS DE DEBUG ===");

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro interno do servidor",
        details: error.stack || "Sem stack trace disponível"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
