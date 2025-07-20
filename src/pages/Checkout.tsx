import React, { useState, useEffect } from "react";
import { useCart } from "@/hooks/useCart";
import { useCoupon } from "@/hooks/useCoupon";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/utils/formatCurrency";
import { Navigate, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CheckoutProgress from "@/components/checkout/CheckoutProgress";
import CreditCardPreview from "@/components/checkout/CreditCardPreview";
import OrderSummary from "@/components/checkout/OrderSummary";
import PaymentMethodCards from "@/components/checkout/PaymentMethodCards";
import FormattedInput from "@/components/checkout/FormattedInput";
import CepLookup from "@/components/checkout/CepLookup";

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

interface PaymentData {
  nomeCompleto: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
  // Dados de endereço
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  // Dados do cartão
  numeroCartao: string;
  nomeNoCartao: string;
  validadeCartao: string;
  cvv: string;
  parcelas: number;
  card_hash?: string;
}

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cartItems, cartTotal, clearCart } = useCart();
  const {
    appliedCoupon,
    getDiscountedTotal,
    hasActiveCoupon,
    discountAmount,
    recordCouponUsage
  } = useCoupon();

  // Calcular total com desconto
  const finalTotal = getDiscountedTotal(cartTotal);
  
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    nomeCompleto: "",
    cpfCnpj: "",
    telefone: "",
    email: "",
    // Dados de endereço
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    // Dados do cartão
    numeroCartao: "",
    nomeNoCartao: "",
    validadeCartao: "",
    cvv: "",
    parcelas: 1
  });

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

  const handlePaymentDataChange = (field: string, value: string | number) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressFromCep = (address: {
    rua: string;
    bairro: string;
    cidade: string;
    estado: string;
  }) => {
    setPaymentData(prev => ({
      ...prev,
      ...address
    }));
  };

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
            birth_date: "1990-01-01"
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
        console.error("Erro detalhado na chamada da função:", error);
        throw new Error(`Erro de conexão: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error("Resposta de erro da API:", data);
        throw new Error(data?.error || "Erro no processamento do pagamento");
      }

      console.log("Resposta da API Click2Pay:", data);

      // Processar resposta baseado no método de pagamento - USAR DADOS CORRETOS
      if (paymentMethod === "boleto") {
        if (!data.success || !data.boleto) {
          throw new Error(data.error || "Erro ao gerar boleto");
        }

        // Registrar uso do cupom se houver um aplicado
        if (hasActiveCoupon && appliedCoupon?.couponId) {
          try {
            await recordCouponUsage(data.boleto.tid || `boleto_${Date.now()}`, appliedCoupon.couponId, discountAmount.toString());
          } catch (couponError) {
            console.error("Erro ao registrar uso do cupom:", couponError);
          }
        }
        
        clearCart();
        
        // Redirecionar para página de instruções com dados corretos (problema 2)
        navigate("/payment-instructions", { 
          state: { 
            paymentMethod: "boleto", 
            paymentData: {
              barcode: data.boleto.barcode,
              linhaDigitavel: data.boleto.linhaDigitavel,
              url: data.boleto.url,
              urlBoleto: data.boleto.urlBoleto || data.boleto.url,
              vencimento: data.boleto.vencimento || data.boleto.due_date,
              boleto_barcode: data.boleto.barcode, // Campo adicional
              boleto_url: data.boleto.url, // Campo adicional
              boleto_due_date: data.boleto.due_date // Campo adicional
            },
            orderId: data.boleto.tid,
            tid: data.boleto.tid
          } 
        });
      } else {
        // Lógica para outros métodos de pagamento
        if (!data.orderId) {
          throw new Error("Erro: Ordem não foi criada corretamente");
        }

        // Redirecionar baseado no método de pagamento
        if (paymentMethod === "cartao") {
          if (data.status === "paid" || data.status === "approved") {
            if (hasActiveCoupon && appliedCoupon?.couponId && data.orderId) {
              try {
                await recordCouponUsage(data.orderId, appliedCoupon.couponId, discountAmount.toString());
              } catch (couponError) {
                console.error("Erro ao registrar uso do cupom:", couponError);
              }
            }
            
            clearCart();
            toast({
              title: "Pagamento aprovado!",
              description: "Seu pagamento foi processado com sucesso.",
            });
            navigate("/payment-success", { 
              state: { 
                orderId: data.orderId, 
                tid: data.tid 
              } 
            });
          } else {
            throw new Error(data.message || "Cartão recusado ou aguardando aprovação");
          }
        } else if (paymentMethod === "pix") {
          // Para PIX, verificar se temos os dados necessários
          if (!data.paymentData?.data?.pix?.textPayment) {
            throw new Error("Erro: Dados PIX não foram gerados corretamente");
          }
          
          if (hasActiveCoupon && appliedCoupon?.couponId && data.orderId) {
            try {
              await recordCouponUsage(data.orderId, appliedCoupon.couponId, discountAmount.toString());
            } catch (couponError) {
              console.error("Erro ao registrar uso do cupom:", couponError);
            }
          }
          
          clearCart();
          
          // Preparar dados do PIX para a página de instruções - USAR CAMPOS CORRETOS
          const pixData = {
            qr_code_image: data.paymentData?.data?.pix?.qrCodeImage?.base64,
            qr_code: data.paymentData?.data?.pix?.textPayment,
            qrCodeImage: data.paymentData?.data?.pix?.qrCodeImage?.base64,
            pixCode: data.paymentData?.data?.pix?.textPayment,
            expires_at: data.paymentData?.data?.expires_in
          };
          
          // Redirecionar para página de instrução
          navigate("/payment-instructions", { 
            state: { 
              paymentMethod: "pix", 
              paymentData: pixData,
              orderId: data.orderId,
              tid: data.tid
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
                {/* Dados Pessoais */}
                <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between text-xl">
                      <span className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                        <span>Dados Pessoais</span>
                      </span>
                      {profileLoaded && (
                        <span className="text-sm font-normal text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                          ✓ Carregado do perfil
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    <FormattedInput
                      id="nomeCompleto"
                      label="Nome Completo"
                      value={paymentData.nomeCompleto}
                      onChange={(value) => handlePaymentDataChange("nomeCompleto", value)}
                      type="text"
                      required
                      className="md:col-span-2"
                    />
                    <FormattedInput
                      id="cpfCnpj"
                      label="CPF/CNPJ"
                      value={paymentData.cpfCnpj}
                      onChange={(value) => handlePaymentDataChange("cpfCnpj", value)}
                      type="cpf"
                      placeholder="000.000.000-00"
                      required
                    />
                    <FormattedInput
                      id="telefone"
                      label="Telefone"
                      value={paymentData.telefone}
                      onChange={(value) => handlePaymentDataChange("telefone", value)}
                      type="phone"
                      placeholder="(11) 99999-9999"
                      required
                    />
                    <FormattedInput
                      id="email"
                      label="Email"
                      value={paymentData.email}
                      onChange={(value) => handlePaymentDataChange("email", value)}
                      type="email"
                      placeholder="seu@email.com"
                      required
                      className="md:col-span-2"
                    />
                  </CardContent>
                </Card>

                {/* Endereço */}
                <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between text-xl">
                      <span className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                        <span>Endereço de Entrega</span>
                      </span>
                      {profileLoaded && (
                        <span className="text-sm font-normal text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                          ✓ Carregado do perfil
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <FormattedInput
                        id="cep"
                        label="CEP"
                        value={paymentData.cep}
                        onChange={(value) => handlePaymentDataChange("cep", value)}
                        type="cep"
                        placeholder="00000-000"
                        required
                        className="flex-1"
                      />
                      <div className="flex items-end">
                        <CepLookup cep={paymentData.cep} onAddressFound={handleAddressFromCep} />
                      </div>
                    </div>
                    
                    <FormattedInput
                      id="rua"
                      label="Rua/Logradouro"
                      value={paymentData.rua}
                      onChange={(value) => handlePaymentDataChange("rua", value)}
                      type="text"
                      required
                    />
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <FormattedInput
                        id="numero"
                        label="Número"
                        value={paymentData.numero}
                        onChange={(value) => handlePaymentDataChange("numero", value)}
                        type="text"
                        required
                      />
                      <FormattedInput
                        id="complemento"
                        label="Complemento"
                        value={paymentData.complemento}
                        onChange={(value) => handlePaymentDataChange("complemento", value)}
                        type="text"
                        placeholder="Opcional"
                        className="md:col-span-2"
                      />
                    </div>
                    
                    <FormattedInput
                      id="bairro"
                      label="Bairro"
                      value={paymentData.bairro}
                      onChange={(value) => handlePaymentDataChange("bairro", value)}
                      type="text"
                      required
                    />
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormattedInput
                        id="cidade"
                        label="Cidade"
                        value={paymentData.cidade}
                        onChange={(value) => handlePaymentDataChange("cidade", value)}
                        type="text"
                        required
                      />
                      <FormattedInput
                        id="estado"
                        label="Estado"
                        value={paymentData.estado}
                        onChange={(value) => handlePaymentDataChange("estado", value)}
                        type="text"
                        placeholder="SP"
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Método de Pagamento */}
                <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-3 text-xl">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                      <span>Método de Pagamento</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PaymentMethodCards 
                      selectedMethod={paymentMethod} 
                      onMethodChange={setPaymentMethod} 
                    />

                    {/* Campos específicos para cartão */}
                    {paymentMethod === "cartao" && (
                      <div className="mt-6 space-y-6">
                        <div className="grid lg:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <FormattedInput
                              id="numeroCartao"
                              label="Número do Cartão"
                              value={paymentData.numeroCartao}
                              onChange={(value) => handlePaymentDataChange("numeroCartao", value)}
                              type="card"
                              placeholder="1234 5678 9012 3456"
                              required
                            />
                            <FormattedInput
                              id="nomeNoCartao"
                              label="Nome no Cartão"
                              value={paymentData.nomeNoCartao}
                              onChange={(value) => handlePaymentDataChange("nomeNoCartao", value)}
                              type="text"
                              placeholder="Como está impresso no cartão"
                              required
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <FormattedInput
                                id="validadeCartao"
                                label="Validade"
                                value={paymentData.validadeCartao}
                                onChange={(value) => handlePaymentDataChange("validadeCartao", value)}
                                type="expiry"
                                placeholder="MM/AAAA"
                                required
                              />
                              <FormattedInput
                                id="cvv"
                                label="CVV"
                                value={paymentData.cvv}
                                onChange={(value) => handlePaymentDataChange("cvv", value)}
                                type="cvv"
                                placeholder="123"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-foreground block mb-2">
                                Parcelas <span className="text-destructive">*</span>
                              </label>
                              <Select 
                                value={paymentData.parcelas.toString()} 
                                onValueChange={(value) => handlePaymentDataChange("parcelas", parseInt(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione as parcelas" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                                    <SelectItem key={i} value={i.toString()}>
                                      {i}x de {formatCurrency(finalTotal / i)}
                                      {i === 1 ? " à vista" : " sem juros"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-center">
                            <CreditCardPreview
                              cardNumber={paymentData.numeroCartao}
                              cardName={paymentData.nomeNoCartao}
                              cardExpiry={paymentData.validadeCartao}
                              cvv={paymentData.cvv}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

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
