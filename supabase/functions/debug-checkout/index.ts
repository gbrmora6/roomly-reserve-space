import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  try {
    console.log("=== DEBUG CHECKOUT INICIADO ===");
    console.log("Method:", req.method);
    console.log("URL:", req.url);
    
    if (req.method === "OPTIONS") {
      console.log("Requisição OPTIONS - retornando CORS");
      return new Response(null, { headers: corsHeaders });
    }

    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Verificando variáveis de ambiente...");
    console.log("- SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
    console.log("- SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis do Supabase não configuradas");
    }

    // Criar cliente Supabase
    console.log("Criando cliente Supabase...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ler body
    let body;
    try {
      const text = await req.text();
      console.log("Text recebido:", text);
      body = JSON.parse(text);
      console.log("Body parseado:", JSON.stringify(body, null, 2));
    } catch (error) {
      console.error("Erro ao fazer parse do JSON:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body", details: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId } = body;
    console.log("UserID extraído:", userId);

    if (!userId) {
      throw new Error("userId é obrigatório");
    }

    // Buscar dados do usuário
    console.log("Buscando dados do usuário...");
    const { data: userData, error: userError } = await supabase
      .auth.admin.getUserById(userId);

    console.log("Resultado busca usuário:", { userData: userData?.user?.email, userError });

    if (userError) {
      console.error("Erro ao buscar usuário:", userError);
      throw new Error(`Erro ao buscar usuário: ${userError.message}`);
    }

    if (!userData?.user) {
      throw new Error("Usuário não encontrado");
    }

    // Buscar profile do usuário
    console.log("Buscando profile do usuário...");
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('branch_id, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();

    console.log("Resultado busca profile:", { profile, profileError });

    if (profileError) {
      console.error("Erro ao buscar profile:", profileError);
      throw new Error(`Erro ao buscar profile do usuário: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error("Profile do usuário não encontrado");
    }

    // Buscar carrinho do usuário
    console.log("Buscando carrinho do usuário...");
    const { data: cartItems, error: cartError } = await supabase
      .rpc('get_cart', { p_user_id: userId });

    console.log("Resultado busca carrinho:", { cartItems, cartError });

    if (cartError) {
      console.error("Erro ao buscar carrinho:", cartError);
      throw new Error(`Erro ao buscar carrinho: ${cartError.message}`);
    }

    if (!cartItems || cartItems.length === 0) {
      throw new Error("Carrinho vazio");
    }

    console.log("Carrinho encontrado com", cartItems.length, "itens");

    // Calcular total
    const totalAmount = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    console.log("Valor total:", totalAmount);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Debug concluído com sucesso",
        data: {
          userId,
          userEmail: userData.user.email,
          profile,
          cartItemsCount: cartItems.length,
          totalAmount
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("=== ERRO CAPTURADO NO DEBUG FUNCTION ===");
    console.error("Tipo do erro:", typeof error);
    console.error("Constructor:", error?.constructor?.name);
    console.error("Mensagem:", error?.message);
    console.error("Stack trace:", error?.stack);
    
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