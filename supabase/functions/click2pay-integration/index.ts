import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== EDGE FUNCTION INICIADO ===");
  
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

    console.log("3. Variáveis de ambiente:");
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

    // Teste simples: só buscar dados do usuário
    console.log("6. Buscando dados do usuário...");
    const { data: userData, error: userError } = await supabase
      .auth.admin.getUserById(userId);

    if (userError) {
      console.error("Erro ao buscar usuário:", userError);
      throw new Error(`Erro ao buscar usuário: ${userError.message}`);
    }

    if (!userData?.user) {
      throw new Error("Usuário não encontrado");
    }

    console.log("7. Usuário encontrado:", userData.user.email);

    // Por enquanto, vamos retornar sucesso sem fazer nada mais
    console.log("8. Retornando sucesso de teste...");
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Teste funcionando",
        userEmail: userData.user.email,
        paymentMethod
      }),
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