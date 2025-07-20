import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    
    console.log("Mock Click2Pay - Path:", path);
    console.log("Mock Click2Pay - Method:", req.method);
    
    // Mock para PIX
    if (path === "/v1/transactions/pix" && req.method === "POST") {
      const body = await req.json();
      console.log("Mock PIX Request:", JSON.stringify(body, null, 2));
      
      const mockResponse = {
        success: true,
        transactionId: `mock_pix_${Date.now()}`,
        qrCode: "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000520400005303986540510.905802BR5913MOCK MERCHANT6009SAO PAULO62070503***6304ABCD",
        qrCodeImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        amount: body.totalAmount
      };
      
      return new Response(JSON.stringify(mockResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Mock para Boleto
    if (path === "/v1/transactions/boleto" && req.method === "POST") {
      const body = await req.json();
      console.log("Mock Boleto Request:", JSON.stringify(body, null, 2));
      
      const mockResponse = {
        success: true,
        transactionId: `mock_boleto_${Date.now()}`,
        boletoUrl: "https://mock-boleto-url.com/boleto.pdf",
        boletoCode: "23791.23456 78901.234567 89012.345678 9 12345678901234",
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        amount: body.totalAmount
      };
      
      return new Response(JSON.stringify(mockResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Mock para Cartão
    if (path === "/v1/transactions/card" && req.method === "POST") {
      const body = await req.json();
      console.log("Mock Card Request:", JSON.stringify(body, null, 2));
      
      const mockResponse = {
        success: true,
        transactionId: `mock_card_${Date.now()}`,
        status: "approved",
        authorizationCode: "123456",
        amount: body.totalAmount
      };
      
      return new Response(JSON.stringify(mockResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Mock para ping/health check
    if (path === "/v1/ping" && req.method === "GET") {
      return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Endpoint não encontrado
    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("Mock Click2Pay Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});