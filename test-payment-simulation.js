// Script para testar a simulação de pagamento
const testPaymentSimulation = async () => {
  const orderId = "305c2366-866b-4214-b10f-eaa6fe075e4e";
  
  try {
    const response = await fetch('https://fgiidcdsvmqxdkclgety.supabase.co/functions/v1/simulate-payment-confirmed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaWlkY2Rzdm1xeGRrY2xnZXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NDY3NDksImV4cCI6MjA2MTAyMjc0OX0.Wwc-QQghL_Z7XE4S_VuweP01TCW6id07LZRht6gynAM'
      },
      body: JSON.stringify({ orderId })
    });
    
    const result = await response.json();
    console.log('Resultado da simulação:', result);
    
    if (result.success) {
      console.log('✅ Simulação bem-sucedida!');
      console.log('Ordem final:', result.results.order);
      console.log('Reservas de sala:', result.results.bookings);
      console.log('Reservas de equipamento:', result.results.equipmentBookings);
      console.log('Itens restantes no carrinho:', result.results.cartItemsRemaining);
    } else {
      console.error('❌ Erro na simulação:', result.error);
    }
    
  } catch (error) {
    console.error('Erro ao chamar a função:', error);
  }
};

// Execute o teste
testPaymentSimulation();