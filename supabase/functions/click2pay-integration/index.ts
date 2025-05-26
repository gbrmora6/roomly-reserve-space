
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { action, ...requestData } = await req.json()

    // Get Click2Pay credentials from Supabase secrets
    const clientId = Deno.env.get('CLICK2PAY_CLIENT_ID')
    const clientSecret = Deno.env.get('CLICK2PAY_CLIENT_SECRET')
    const baseUrl = Deno.env.get('CLICK2PAY_BASE_URL') || 'https://sandbox.click2pay.com.br/api'
    const sellerId = Deno.env.get('CLICK2PAY_SELLER_ID')

    if (!clientId || !clientSecret || !sellerId) {
      console.error('Missing Click2Pay credentials')
      return new Response(
        JSON.stringify({ 
          error: 'Click2Pay credentials not configured',
          missing: {
            clientId: !clientId,
            clientSecret: !clientSecret,
            sellerId: !sellerId
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Click2Pay integration called with action:', action)
    console.log('Using base URL:', baseUrl)

    // Generate access token
    const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text()
      console.error('Failed to get Click2Pay token:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Click2Pay', details: tokenError }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { access_token } = await tokenResponse.json()

    switch (action) {
      case 'create-payment':
        const { amount, description, customer, orderId } = requestData
        
        const paymentData = {
          seller_id: sellerId,
          amount: Math.round(amount * 100), // Convert to centavos
          currency: 'BRL',
          description: description || 'Pagamento de produtos/serviços',
          external_reference: orderId,
          customer: {
            name: customer.name,
            email: customer.email,
            document: customer.document || customer.cpf,
            phone: customer.phone,
          },
          payment_methods: ['credit_card', 'debit_card', 'pix'],
          success_url: `${req.headers.get('origin')}/payment-success`,
          cancel_url: `${req.headers.get('origin')}/payment-canceled`,
          notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/click2pay-webhook`,
        }

        const paymentResponse = await fetch(`${baseUrl}/v1/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
        })

        if (!paymentResponse.ok) {
          const paymentError = await paymentResponse.text()
          console.error('Failed to create Click2Pay payment:', paymentError)
          return new Response(
            JSON.stringify({ error: 'Failed to create payment', details: paymentError }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        const paymentResult = await paymentResponse.json()
        console.log('Click2Pay payment created:', paymentResult)

        return new Response(
          JSON.stringify(paymentResult),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )

      case 'get-payment':
        const { paymentId } = requestData
        
        const getPaymentResponse = await fetch(`${baseUrl}/v1/payments/${paymentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!getPaymentResponse.ok) {
          const getPaymentError = await getPaymentResponse.text()
          console.error('Failed to get Click2Pay payment:', getPaymentError)
          return new Response(
            JSON.stringify({ error: 'Failed to get payment', details: getPaymentError }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        const getPaymentResult = await getPaymentResponse.json()
        
        return new Response(
          JSON.stringify(getPaymentResult),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }

  } catch (error) {
    console.error('Click2Pay integration error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
