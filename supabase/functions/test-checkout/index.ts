import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== TEST CHECKOUT INICIADO ===");
    
    // Ler body
    const body = await req.json();
    console.log("Body recebido:", JSON.stringify(body, null, 2));
    
    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("Variáveis de ambiente:");
    console.log("- SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
    console.log("- SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis do Supabase não configuradas");
    }
    
    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { userId } = body;
    console.log("UserID:", userId);
    
    // Testar busca do carrinho
    console.log("Testando busca do carrinho...");
    const { data: cartItems, error: cartError } = await supabase
      .rpc('get_cart', { p_user_id: userId });
      
    console.log("Resultado:", { cartItems, cartError });
    
    if (cartError) {
      console.error("Erro no carrinho:", cartError);
      throw new Error(`Erro ao buscar carrinho: ${cartError.message}`);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Teste concluído com sucesso",
        cartItems: cartItems || [],
        cartCount: cartItems?.length || 0
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (error) {
    console.error("Erro no teste:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Erro desconhecido",
        errorType: error?.constructor?.name || typeof error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});