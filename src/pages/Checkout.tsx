
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OrderSummary } from "@/components/ui/order-summary";
import { CouponInput } from "@/components/ui/coupon-input";
import { MainLayout } from "@/components/ui/main-layout";
import { PersonalDataSection } from "@/components/checkout/PersonalDataSection";
import { AddressSection } from "@/components/checkout/AddressSection";
import { PaymentMethodSection } from "@/components/checkout/PaymentMethodSection";
import { CheckoutProgress } from "@/components/ui/checkout-progress";
import { useCheckout } from "@/hooks/useCheckout";
import { formatCurrency } from "@/utils/formatCurrency";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { useCoupon } from "@/hooks/useCoupon";
import { PaymentDataExtended } from "@/types/payment";

// Declaração de tipos para a biblioteca Click2Pay
declare global {
  interface Window {
    C2PgenerateHash: (cardDetails: {
      number: string;
      name: string;
      expiry: string;
      cvc: string;
    }) => Promise<string>;
  }
}

const Checkout = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { recordCouponUsage } = useCoupon();
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const {
    paymentData,
    paymentMethod,
    appliedCoupon,
    discountAmount,
    finalTotal,
    cartItems,
    cartTotal,
    setPaymentData,
    setPaymentMethod,
    setAppliedCoupon,
    setDiscountAmount,
    handlePaymentDataChange,
    handleAddressFromCep,
    processPayment
  } = useCheckout();
  
  // Verificar se há cupom ativo
  const hasActiveCoupon = appliedCoupon && discountAmount > 0;

  // Hook para carregar dados do usuário
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Erro ao buscar perfil do usuário:", error);
          return;
        }

        if (data) {
          setPaymentData(prev => ({
            ...prev,
            nomeCompleto: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            cpfCnpj: data.cpf || data.cnpj || "",
            telefone: data.phone || "",
            email: user.email || "",
            // Pré-preencher endereço
            rua: data.street || "",
            numero: data.house_number || "",
            bairro: data.neighborhood || "",
            cidade: data.city || "",
            estado: data.state || "",
            cep: data.cep || "",
          }));
          setProfileLoaded(true);
          
          toast({
            title: "Dados carregados",
            description: "Seus dados foram pré-preenchidos automaticamente a partir do seu perfil.",
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados do perfil:', error);
      }
    };

    loadUserProfile();
  }, [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (cartItems.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      let processedPaymentData = { ...paymentData };

      // Para cartão de crédito, gerar card_hash usando cardc2p.js
      if (paymentMethod === "cartao") {
        // Verificar se a biblioteca cardc2p foi carregada
        if (!window.C2PgenerateHash) {
          throw new Error("Biblioteca de cartão não carregada. Recarregue a página.");
        }

        const cardDetails = {
          number: paymentData.numeroCartao.replace(/\s/g, ''),
          name: paymentData.nomeNoCartao,
          expiry: paymentData.validadeCartao,
          cvc: paymentData.cvv
        };

        console.log("Gerando card_hash para cartão...");
        const cardHash = await window.C2PgenerateHash(cardDetails);
        
        if (!cardHash) {
          throw new Error("Erro ao processar dados do cartão");
        }

        processedPaymentData.card_hash = cardHash;
        console.log("Card hash gerado com sucesso");
      }

      console.log("Enviando dados para edge function:", {
        action: 'create-checkout',
        userId: user.id,
        paymentMethod,
        paymentData: processedPaymentData
      });

      let data, error;

      // Processar pagamento baseado no método selecionado
      if (paymentMethod === "boleto") {
        // Validar valor mínimo para boleto
        if (finalTotal < 30) {
          throw new Error(`Valor mínimo para boleto é R$ 30,00. Valor atual: ${formatCurrency(finalTotal)}`);
        }

        // Para boleto, usar a edge function específica
        const boletoPayload = {
          payerInfo: {
            address: {
              place: processedPaymentData.rua || '',
              number: processedPaymentData.numero || '',
              complement: processedPaymentData.complemento || '',
              neighborhood: processedPaymentData.bairro || '',
              city: processedPaymentData.cidade || '',
              state: processedPaymentData.estado || '',
              zipcode: (processedPaymentData.cep || '').replace(/\D/g, '')
            },
            name: processedPaymentData.nomeCompleto || '',
            taxid: (processedPaymentData.cpfCnpj || '').replace(/\D/g, ''),
            phonenumber: (processedPaymentData.telefone || '').replace(/\D/g, ''),
            email: processedPaymentData.email || '',
            birth_date: "1990-01-01" // Data padrão - pode ser ajustada
          },
          totalAmount: finalTotal,
          orderId: `order_${Date.now()}_${user.id.substring(0, 8)}`,
          callbackUrl: `${window.location.origin}/payment-webhook`
        };

        console.log('Payload do boleto:', JSON.stringify(boletoPayload, null, 2));

        const response = await supabase.functions.invoke('checkout-boleto', {
          body: boletoPayload
        });
        
        data = response.data;
        error = response.error;
      } else {
        // Para PIX e cartão, usar a edge function click2pay-integration
        const response = await supabase.functions.invoke('click2pay-integration', {
          body: {
            action: 'create-checkout',
            userId: user.id,
            paymentMethod,
            paymentData: processedPaymentData,
            couponData: hasActiveCoupon ? {
              couponId: appliedCoupon?.couponId,
              couponCode: appliedCoupon?.couponCode,
              discountAmount: discountAmount,
              originalTotal: cartTotal,
              finalTotal: finalTotal
            } : null
          }
        });
        
        data = response.data;
        error = response.error;
      }

      console.log("Resposta completa da função:", { data, error });

      if (error) {
        console.error("Erro detalhado na chamada da função:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
          context: error.context
        });
        throw new Error(`Erro de conexão: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error("Resposta de erro da API:", data);
        throw new Error(data?.error || "Erro no processamento do pagamento");
      }

      console.log("Resposta da API Click2Pay:", data);

      // Processar resposta baseado no método de pagamento
      if (paymentMethod === "boleto") {
        // Verificar se o boleto foi criado corretamente
        if (!data.success || !data.boleto) {
          throw new Error(data.error || "Erro ao gerar boleto");
        }

        // Registrar uso do cupom se houver um aplicado
        if (hasActiveCoupon && appliedCoupon?.couponId) {
          try {
            await recordCouponUsage(data.boleto.tid || `boleto_${Date.now()}`, appliedCoupon.couponId, discountAmount);
          } catch (couponError) {
            console.error("Erro ao registrar uso do cupom:", couponError);
            // Não bloquear o fluxo por erro no cupom
          }
        }
        
        // Limpar carrinho
        clearCart();
        
        // Redirecionar para página de instruções do boleto
        navigate("/payment-instructions", { 
          state: { 
            paymentMethod: "boleto", 
            paymentData: {
              barcode: data.boleto.barcode,
              linhaDigitavel: data.boleto.barcode, // Usar barcode como linhaDigitavel
              url: data.boleto.url,
              urlBoleto: data.boleto.url, // Usar url como urlBoleto
              vencimento: data.boleto.due_date,
              tid: data.tid,
              due_date: data.boleto.due_date,
              amount: data.totalAmount
            },
            orderId: data.orderId // Usar o orderId retornado pela Edge Function
          } 
        });
      } else {
        // Lógica original para outros métodos de pagamento
        // Verificar se a transação foi criada corretamente
        if (!data.orderId) {
          throw new Error("Erro: Ordem não foi criada corretamente");
        }

        // Redirecionar baseado no método de pagamento e status
        if (paymentMethod === "cartao") {
          if (data.status === "paid" || data.status === "approved") {
            // Registrar uso do cupom se houver um aplicado
            if (hasActiveCoupon && appliedCoupon?.couponId && data.orderId) {
              try {
                await recordCouponUsage(data.orderId, appliedCoupon.couponId, discountAmount);
              } catch (couponError) {
                console.error("Erro ao registrar uso do cupom:", couponError);
                // Não bloquear o fluxo por erro no cupom
              }
            }
            
            // Limpar carrinho apenas se pagamento foi aprovado
            clearCart();
            toast({
              title: "Pagamento aprovado!",
              description: "Seu pagamento foi processado com sucesso.",
            });
            navigate("/payment-success");
          } else {
            throw new Error(data.message || "Cartão recusado ou aguardando aprovação");
          }
        } else if (paymentMethod === "pix") {
          // Para PIX, verificar se temos os dados necessários
          if (!data.pix?.qr_code_image && !data.pix?.qr_code) {
            throw new Error("Erro: QR Code PIX não foi gerado corretamente");
          }
          
          // Registrar uso do cupom se houver um aplicado
          if (hasActiveCoupon && appliedCoupon?.couponId && data.orderId) {
            try {
              await recordCouponUsage(data.orderId, appliedCoupon.couponId, discountAmount);
            } catch (couponError) {
              console.error("Erro ao registrar uso do cupom:", couponError);
              // Não bloquear o fluxo por erro no cupom
            }
          }
          
          // Limpar carrinho
          clearCart();
          
          // Preparar dados do PIX para a página de instruções
          const pixData = {
            qrCodeImage: data.pix.qr_code_image,
            pixCode: data.pix.qr_code,
            // reference: data.reference, // Removido pois não está sendo retornado pela Edge Function para PIX
            orderId: data.orderId
          };
          
          // Redirecionar para página de instrução
          navigate("/payment-instructions", { 
            state: { 
              paymentMethod: "pix", 
              paymentData: pixData,
              orderId: data.orderId 
            } 
          });
        }
      }

    } catch (error) {
      console.error("Erro no checkout:", error);
      
      // Verificar se é erro específico do PIX
      if (error.message?.includes('PIX_UNAVAILABLE')) {
        toast({
          variant: "destructive",
          title: "PIX temporariamente indisponível",
          description: "O serviço PIX está instável. Tente pagamento por boleto ou cartão.",
        });
      } else if (error.message?.includes('503')) {
        toast({
          variant: "destructive",
          title: "Serviço temporariamente indisponível",
          description: "Tente novamente em alguns minutos ou escolha outro método de pagamento.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro no pagamento",
          description: error.message || "Ocorreu um erro ao processar o pagamento",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
        <div className="container py-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold tracking-tight mb-2">Finalizar Compra</h1>
              <p className="text-muted-foreground">Complete seus dados para finalizar o pedido</p>
            </div>

            <CheckoutProgress currentStep={currentStep} />

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Formulário Principal */}
              <div className="lg:col-span-2 space-y-6">
                <PersonalDataSection 
                  paymentData={paymentData}
                  onPaymentDataChange={handlePaymentDataChange}
                />

                <AddressSection 
                  paymentData={paymentData}
                  onPaymentDataChange={handlePaymentDataChange}
                  onAddressFromCep={handleAddressFromCep}
                />

                <PaymentMethodSection 
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                  paymentData={paymentData}
                  onPaymentDataChange={handlePaymentDataChange}
                  finalTotal={finalTotal}
                />

                <Button 
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  size="lg"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processando pagamento...</span>
                    </div>
                  ) : (
                    `Finalizar Pagamento - ${formatCurrency(finalTotal)}`
                  )}
                </Button>
              </div>

              {/* Resumo do Pedido */}
              <div className="lg:col-span-1">
                <OrderSummary 
                  cartItems={cartItems} 
                  cartTotal={cartTotal}
                  appliedCoupon={appliedCoupon}
                  discountAmount={discountAmount}
                  finalTotal={finalTotal}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Checkout;
