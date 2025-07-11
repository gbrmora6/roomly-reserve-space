import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  
  return errors;
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
      price_per_unit: item.price
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
    const click2payData = {
      client_id: clientId,
      client_secret: clientSecret,
      payment_method: paymentMethod,
      amount: Math.round(totalAmount * 100), // Click2Pay espera centavos
      description: `Pedido #${order.id}`,
      customer: {
        name: paymentData.nomeCompleto,
        document: paymentData.cpfCnpj.replace(/[^\d]/g, ''),
        phone: paymentData.telefone.replace(/[^\d]/g, '')
      }
    };

    if (paymentMethod === "cartao" && paymentData.card_hash) {
      click2payData.card_hash = paymentData.card_hash;
      click2payData.installments = paymentData.parcelas || 1;
    }

    console.log("16. Enviando para Click2Pay:", JSON.stringify(click2payData, null, 2));

    // Chamar API da Click2Pay
    const click2payResponse = await fetch('https://api.click2pay.com.br/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(click2payData)
    });

    console.log("17. Status da resposta Click2Pay:", click2payResponse.status);
    
    const click2payResult = await click2payResponse.json();
    console.log("18. Resposta Click2Pay:", JSON.stringify(click2payResult, null, 2));

    if (!click2payResponse.ok) {
      throw new Error(`Click2Pay API error: ${click2payResult.message || 'Unknown error'}`);
    }

    // Atualizar ordem com dados da Click2Pay
    console.log("19. Atualizando ordem com dados da Click2Pay...");
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        click2pay_tid: click2payResult.tid,
        status: click2payResult.status || 'pending',
        external_identifier: click2payResult.id
      })
      .eq('id', order.id);

    if (updateError) {
      console.error("Erro ao atualizar ordem:", updateError);
      // Não falhar aqui, apenas logar
    }

    // Confirmar pagamento se necessário
    if (click2payResult.status === 'paid' || click2payResult.status === 'approved') {
      console.log("20. Confirmando pagamento do carrinho...");
      const { error: confirmError } = await supabase
        .rpc('confirm_cart_payment', { 
          p_user_id: userId, 
          p_order_id: order.id 
        });

      if (confirmError) {
        console.error("Erro ao confirmar pagamento:", confirmError);
      }
    }

    console.log("21. Processamento concluído com sucesso");

    // Retornar resposta baseada no método de pagamento
    const response = {
      success: true,
      orderId: order.id,
      status: click2payResult.status,
      paymentMethod,
      ...click2payResult
    };

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