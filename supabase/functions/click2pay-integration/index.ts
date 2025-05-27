
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Headers CORS necessários para permitir requisições do frontend
 * Permite que qualquer origem faça requisições para esta função
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Função Edge para integração com a API Click2Pay
 * Esta função atua como um proxy seguro entre o frontend e a API Click2Pay
 * Responsabilidades:
 * - Autenticar com Click2Pay usando credenciais seguras
 * - Criar pagamentos PIX, boleto e cartão de crédito
 * - Consultar status de pagamentos
 * - Gerenciar tokens de acesso da API
 */
serve(async (req) => {
  // Resposta para requisições OPTIONS (preflight CORS)
  // Necessário para permitir requisições do navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Inicializar cliente Supabase para operações com banco de dados
    // Usa credenciais de ambiente para acesso seguro
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Extrair dados da requisição
    // action: tipo de operação (create-payment, get-payment)
    // requestData: dados específicos da operação
    const { action, ...requestData } = await req.json()

    // Obter credenciais Click2Pay das variáveis de ambiente (Supabase Secrets)
    // Estas credenciais são configuradas no painel do Supabase para segurança
    const clientId = Deno.env.get('CLICK2PAY_CLIENT_ID')
    const clientSecret = Deno.env.get('CLICK2PAY_CLIENT_SECRET')
    const baseUrl = Deno.env.get('CLICK2PAY_BASE_URL') || 'https://sandbox.click2pay.com.br/api'
    const sellerId = Deno.env.get('CLICK2PAY_SELLER_ID')

    // Validar se todas as credenciais necessárias estão disponíveis
    // Retorna erro detalhado informando quais credenciais estão faltando
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

    // Log da ação para debugging e monitoramento
    console.log('Click2Pay integration called with action:', action)
    console.log('Using base URL:', baseUrl)

    /**
     * ETAPA 1: Obter token de acesso da API Click2Pay
     * O Click2Pay usa OAuth 2.0 client_credentials para autenticação
     * Este token é necessário para todas as operações subsequentes
     */
    const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      // Enviar credenciais no formato URL-encoded conforme especificação OAuth
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    // Verificar se a autenticação foi bem-sucedida
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

    // Extrair token de acesso da resposta
    const { access_token } = await tokenResponse.json()

    /**
     * ROTEAMENTO DE AÇÕES
     * Determina qual operação executar baseada no parâmetro 'action'
     */
    switch (action) {
      /**
       * CRIAR PAGAMENTO
       * Cria uma nova transação no Click2Pay com os dados fornecidos
       * Suporta PIX, boleto e cartão de crédito
       */
      case 'create-payment':
        // Extrair dados necessários para criar o pagamento
        const { amount, description, customer, orderId } = requestData
        
        // Montar payload conforme especificação da API Click2Pay
        const paymentData = {
          seller_id: sellerId, // ID do vendedor configurado no Click2Pay
          amount: Math.round(amount * 100), // Converter para centavos (R$ 10,50 = 1050)
          currency: 'BRL', // Moeda brasileira
          description: description || 'Pagamento de produtos/serviços', // Descrição padrão se não fornecida
          external_reference: orderId, // Referência externa para vincular ao pedido interno
          
          // Dados do cliente/comprador
          customer: {
            name: customer.name,
            email: customer.email,
            document: customer.document || customer.cpf, // CPF/CNPJ
            phone: customer.phone,
          },
          
          // Métodos de pagamento disponíveis para o cliente
          payment_methods: ['credit_card', 'debit_card', 'pix'],
          
          // URLs de redirecionamento após pagamento
          success_url: `${req.headers.get('origin')}/payment-success`,
          cancel_url: `${req.headers.get('origin')}/payment-canceled`,
          
          // URL para receber notificações de status do pagamento (webhook)
          notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/click2pay-webhook`,
        }

        // Fazer requisição para criar pagamento na API Click2Pay
        const paymentResponse = await fetch(`${baseUrl}/v1/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`, // Token obtido anteriormente
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
        })

        // Verificar se o pagamento foi criado com sucesso
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

        // Retornar dados do pagamento criado para o frontend
        const paymentResult = await paymentResponse.json()
        console.log('Click2Pay payment created:', paymentResult)

        return new Response(
          JSON.stringify(paymentResult),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )

      /**
       * CONSULTAR PAGAMENTO
       * Busca informações de status de um pagamento específico
       * Usado para verificar se pagamento foi aprovado/rejeitado
       */
      case 'get-payment':
        const { paymentId } = requestData
        
        // Fazer requisição para consultar pagamento na API Click2Pay
        const getPaymentResponse = await fetch(`${baseUrl}/v1/payments/${paymentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
        })

        // Verificar se a consulta foi bem-sucedida
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

        // Retornar dados do pagamento consultado
        const getPaymentResult = await getPaymentResponse.json()
        
        return new Response(
          JSON.stringify(getPaymentResult),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )

      /**
       * AÇÃO INVÁLIDA
       * Retorna erro quando action não é reconhecida
       */
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
    // Captura e log de erros gerais da função
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
