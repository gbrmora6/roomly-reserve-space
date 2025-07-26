import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface PayerInfo {
  address: {
    place: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipcode: string;
  };
  name: string;
  taxid: string;
  phonenumber: string;
  email: string;
  birth_date: string;
}

interface BoletoRequest {
  payerInfo: PayerInfo;
  payment_limit_days: number;
  fine: { mode: string };
  interest: { mode: string };
  totalAmount: number;
  id: string;
  callbackAddress: string;
}

interface Click2PayResponse {
  success?: boolean;
  data?: {
    tid: string;
    payment_type: string;
    externalIdentifier: string;
    totalAmount: string;
    boleto: {
      due_date: string;
      limit_date: string;
      document_number: string;
      barcode: string;
      url: string;
    };
  };
  error?: string;
}

// Função para converter código de barras em linha digitável
function barcodeToDigitableLine(barcode: string): string {
  if (!barcode || barcode.length !== 44) {
    throw new Error('Código de barras inválido');
  }

  // Função auxiliar para calcular dígito verificador módulo 10
  function modulo10(numero: string): string {
    const digits = numero.replace(/[^0-9]/g, '');
    let soma = 0;
    let peso = 2;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let multiplicacao = parseInt(digits[i]) * peso;
      if (multiplicacao >= 10) {
        multiplicacao = 1 + (multiplicacao - 10);
      }
      soma += multiplicacao;
      peso = peso === 2 ? 1 : 2;
    }
    
    const digito = 10 - (soma % 10);
    return digito === 10 ? '0' : digito.toString();
  }

  // Extrair campos do código de barras
  const campo1 = barcode.substr(0, 4) + barcode.substr(19, 5);
  const campo2 = barcode.substr(24, 10);
  const campo3 = barcode.substr(34, 10);
  const campo4 = barcode.substr(4, 1); // Dígito verificador
  const campo5 = barcode.substr(5, 14); // Vencimento + Valor

  // Montar linha digitável com dígitos verificadores
  const linhaDigitavel = 
    campo1.substr(0, 5) + '.' + campo1.substr(5, 4) + modulo10(campo1) + ' ' +
    campo2.substr(0, 5) + '.' + campo2.substr(5, 5) + modulo10(campo2) + ' ' +
    campo3.substr(0, 5) + '.' + campo3.substr(5, 5) + modulo10(campo3) + ' ' +
    campo4 + ' ' +
    campo5;

  return linhaDigitavel;
}

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar se é uma requisição POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse do body da requisição
    const requestBody = await req.json();
    const { 
      payerInfo, 
      totalAmount, 
      orderId, 
      callbackUrl 
    }: {
      payerInfo: PayerInfo;
      totalAmount: number;
      orderId: string;
      callbackUrl?: string;
    } = requestBody;

    // Validações básicas
    console.log('Dados recebidos:', JSON.stringify(requestBody, null, 2));
    
    if (!payerInfo) {
      return new Response(
        JSON.stringify({ error: 'payerInfo é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!totalAmount) {
      return new Response(
        JSON.stringify({ error: 'totalAmount é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Validar campos obrigatórios do payerInfo
    if (!payerInfo.name || !payerInfo.email || !payerInfo.taxid) {
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios do pagador não fornecidos',
          missing: {
            name: !payerInfo.name,
            email: !payerInfo.email,
            taxid: !payerInfo.taxid
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Validar endereço
    if (!payerInfo.address || !payerInfo.address.place || !payerInfo.address.city || !payerInfo.address.state) {
      return new Response(
        JSON.stringify({ 
          error: 'Dados de endereço incompletos',
          missing: {
            place: !payerInfo.address?.place,
            city: !payerInfo.address?.city,
            state: !payerInfo.address?.state
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validar valor mínimo
    console.log(`Validando valor: ${totalAmount} (mínimo: 30)`);
    if (totalAmount < 30) {
      console.log('Erro: Valor abaixo do mínimo');
      return new Response(
        JSON.stringify({ 
          error: 'Valor mínimo do boleto é R$ 30,00',
          received_amount: totalAmount,
          minimum_amount: 30
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Configurações da API Click2Pay
    const click2payOptions = {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authorization': 'Basic MmE2YjQxMzYtNTliMy00NWNkLTlmZTktODg1MTEwMWMyOGYwMTI0NjE3MDkwMDAyNTQ6NzAzYjIwY2E4NDNjN2Q1NjYwYWU0ZDkxMDVjOTgzMzU='
      }
    };

    // Preparar dados do boleto
    const boletoData: BoletoRequest = {
      payerInfo: {
        address: {
          place: payerInfo.address.place,
          number: payerInfo.address.number,
          complement: payerInfo.address.complement || '',
          neighborhood: payerInfo.address.neighborhood,
          city: payerInfo.address.city,
          state: payerInfo.address.state,
          zipcode: payerInfo.address.zipcode
        },
        name: payerInfo.name,
        taxid: payerInfo.taxid,
        phonenumber: payerInfo.phonenumber,
        email: payerInfo.email,
        birth_date: payerInfo.birth_date
      },
      payment_limit_days: 3,
      fine: { mode: 'FIXED' },
      interest: { mode: 'DAILY_AMOUNT' },
      totalAmount: totalAmount,
      id: orderId,
      callbackAddress: callbackUrl || 'https://fgiidcdsvmqxdkclgety.supabase.co/functions/v1/click2pay-webhook'
    };

    // Fazer requisição para a API Click2Pay
    const click2payResponse = await fetch(
      'https://api.click2pay.com.br/v1/transactions/boleto',
      {
        ...click2payOptions,
        body: JSON.stringify(boletoData)
      }
    );

    const responseData = await click2payResponse.json() as Click2PayResponse;
    
    // Log detalhado da resposta da Click2Pay
    console.log('Resposta completa da Click2Pay:', {
      status: click2payResponse.status,
      statusText: click2payResponse.statusText,
      headers: Object.fromEntries(click2payResponse.headers.entries()),
      data: responseData
    });

    // Verificar se a requisição foi bem-sucedida
    if (!click2payResponse.ok) {
      console.error('Erro na API Click2Pay:', responseData);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao processar pagamento', 
          details: responseData 
        }),
        { 
          status: click2payResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Inicializar cliente Supabase (opcional - para salvar dados do boleto)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Salvar informações do boleto no banco (opcional)
    try {
      // Verificar se orderId é um UUID válido, senão gerar um novo
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId);
      
      // Acessar dados do boleto na estrutura correta
      const boletoData = responseData.data?.boleto;
      const transactionData = responseData.data;
      
      const { error: dbError } = await supabase
          .from('boleto_transactions')
          .insert({
            order_id: isValidUUID ? orderId : null, // Usar orderId se for UUID válido, senão null (será gerado automaticamente)
            amount: totalAmount,
            status: 'pending',
            click2pay_transaction_id: transactionData?.tid,
            barcode: boletoData?.barcode,
            digitable_line: boletoData?.barcode ? barcodeToDigitableLine(boletoData.barcode) : null,
            pdf_url: boletoData?.url,
            expires_at: boletoData?.due_date,
            payer_data: payerInfo,
            click2pay_response: responseData
          });
      
      console.log('Tentativa de inserção no banco:', {
        order_id: isValidUUID ? orderId : 'null (auto-generated)',
        orderId_received: orderId,
        is_valid_uuid: isValidUUID
      });

      if (dbError) {
        console.error('Erro ao salvar no banco:', dbError);
        // Não retornar erro aqui, pois o boleto foi criado com sucesso
      } else {
        console.log('Dados salvos com sucesso na tabela boleto_transactions');
      }
    } catch (dbError) {
      console.error('Erro de conexão com banco:', dbError);
      // Continuar mesmo com erro no banco
    }

    // Preparar resposta final
    const boletoData = responseData.data?.boleto;
    const transactionData = responseData.data;
    
    const finalResponse = {
      success: true,
      boleto: {
        tid: transactionData?.tid,
        barcode: boletoData?.barcode,
        linhaDigitavel: boletoData?.barcode ? barcodeToDigitableLine(boletoData.barcode) : null,
        url: boletoData?.url,
        urlBoleto: boletoData?.url, // Alias para compatibilidade
        due_date: boletoData?.due_date,
        vencimento: boletoData?.due_date, // Alias para compatibilidade
        amount: transactionData?.totalAmount
      }
    };
    
    console.log('Resposta final sendo enviada:', finalResponse);
    
    // Retornar resposta de sucesso
    return new Response(
      JSON.stringify(finalResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro interno:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});