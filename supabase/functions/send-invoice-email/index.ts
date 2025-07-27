import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceEmailRequest {
  customerEmail: string;
  customerName: string;
  orderId: string;
  invoiceUrl: string;
  orderType: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("🚀 Invoice email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerEmail, customerName, orderId, invoiceUrl, orderType }: InvoiceEmailRequest = await req.json();

    console.log("📧 Sending invoice email to:", customerEmail, "for order:", orderId);

    const emailResponse = await resend.emails.send({
      from: "Sistema <onboarding@resend.dev>",
      to: [customerEmail],
      subject: "Nota Fiscal Disponível - Pedido #" + orderId.slice(0, 8),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">📄 Nota Fiscal Disponível</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
              Olá <strong>${customerName}</strong>,
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
              A nota fiscal do seu ${orderType} <strong>#${orderId.slice(0, 8)}</strong> já está disponível para download.
            </p>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0; color: #374151; font-weight: 500;">📋 Detalhes do Pedido:</p>
              <p style="margin: 10px 0 0 0; color: #6b7280;">ID: ${orderId}</p>
              <p style="margin: 5px 0 0 0; color: #6b7280;">Tipo: ${orderType}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invoiceUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                📥 Baixar Nota Fiscal
              </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                🔐 Este link é seguro e exclusivo para este pedido.<br>
                💡 Guarde este documento para seus registros fiscais.
              </p>
            </div>
            
            <div style="margin-top: 25px; text-align: center;">
              <p style="color: #6b7280; font-size: 16px; margin: 0;">
                Obrigado por escolher nossos serviços! 🙏
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("✅ Invoice email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
    
  } catch (error: any) {
    console.error("❌ Error in send-invoice-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);