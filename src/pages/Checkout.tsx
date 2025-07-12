
import React, { useState, useEffect } from "react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCurrency } from "@/utils/formatCurrency";
import { Navigate, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
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

      const { data, error } = await supabase.functions.invoke('click2pay-integration', {
        body: {
          action: 'create-checkout',
          userId: user.id,
          paymentMethod,
          paymentData: processedPaymentData
        }
      });

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

      // Verificar se a transação foi criada corretamente
      if (!data.orderId) {
        throw new Error("Erro: Ordem não foi criada corretamente");
      }

      // Redirecionar baseado no método de pagamento e status
      if (paymentMethod === "cartao") {
        if (data.status === "paid" || data.status === "approved") {
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
      } else {
        // Para boleto e Pix, verificar se temos os dados necessários
        if (!data.barcode && !data.qr_code && !data.pix_code) {
          throw new Error("Erro: Dados de pagamento não foram gerados corretamente");
        }
        
        // Limpar carrinho
        clearCart();
        
        // Redirecionar para página de instrução
        navigate("/payment-instructions", { 
          state: { 
            paymentMethod, 
            paymentData: data,
            orderId: data.orderId 
          } 
        });
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
      <div className="container py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>

          <div className="space-y-6">
            {/* Resumo do pedido */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.quantity}x Produto</span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Dados Pessoais
                  {profileLoaded && (
                    <span className="text-sm font-normal text-green-600 bg-green-50 px-2 py-1 rounded">
                      ✓ Carregado do perfil
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nomeCompleto">Nome Completo</Label>
                  <Input
                    id="nomeCompleto"
                    value={paymentData.nomeCompleto}
                    onChange={(e) => handlePaymentDataChange("nomeCompleto", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                  <Input
                    id="cpfCnpj"
                    value={paymentData.cpfCnpj}
                    onChange={(e) => handlePaymentDataChange("cpfCnpj", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={paymentData.telefone}
                    onChange={(e) => handlePaymentDataChange("telefone", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={paymentData.email}
                    onChange={(e) => handlePaymentDataChange("email", e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Endereço
                  {profileLoaded && (
                    <span className="text-sm font-normal text-green-600 bg-green-50 px-2 py-1 rounded">
                      ✓ Carregado do perfil
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={paymentData.cep}
                    onChange={(e) => handlePaymentDataChange("cep", e.target.value)}
                    placeholder="00000-000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rua">Rua/Logradouro</Label>
                  <Input
                    id="rua"
                    value={paymentData.rua}
                    onChange={(e) => handlePaymentDataChange("rua", e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={paymentData.numero}
                      onChange={(e) => handlePaymentDataChange("numero", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={paymentData.complemento}
                      onChange={(e) => handlePaymentDataChange("complemento", e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={paymentData.bairro}
                    onChange={(e) => handlePaymentDataChange("bairro", e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={paymentData.cidade}
                      onChange={(e) => handlePaymentDataChange("cidade", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={paymentData.estado}
                      onChange={(e) => handlePaymentDataChange("estado", e.target.value)}
                      placeholder="SP"
                      maxLength={2}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Método de pagamento */}
            <Card>
              <CardHeader>
                <CardTitle>Método de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pix" id="pix" />
                    <Label htmlFor="pix">Pix (Pagamento instantâneo)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="boleto" id="boleto" />
                    <Label htmlFor="boleto">Boleto Bancário</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cartao" id="cartao" />
                    <Label htmlFor="cartao">Cartão de Crédito</Label>
                  </div>
                </RadioGroup>

                {/* Campos específicos para cartão */}
                {paymentMethod === "cartao" && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="numeroCartao">Número do Cartão</Label>
                      <Input
                        id="numeroCartao"
                        value={paymentData.numeroCartao}
                        onChange={(e) => handlePaymentDataChange("numeroCartao", e.target.value)}
                        placeholder="1234 5678 9012 3456"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="nomeNoCartao">Nome no Cartão</Label>
                      <Input
                        id="nomeNoCartao"
                        value={paymentData.nomeNoCartao}
                        onChange={(e) => handlePaymentDataChange("nomeNoCartao", e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="validadeCartao">Validade</Label>
                        <Input
                          id="validadeCartao"
                          value={paymentData.validadeCartao}
                          onChange={(e) => handlePaymentDataChange("validadeCartao", e.target.value)}
                          placeholder="MM/AAAA"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          value={paymentData.cvv}
                          onChange={(e) => handlePaymentDataChange("cvv", e.target.value)}
                          placeholder="123"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="parcelas">Parcelas</Label>
                      <select
                        id="parcelas"
                        value={paymentData.parcelas}
                        onChange={(e) => handlePaymentDataChange("parcelas", parseInt(e.target.value))}
                        className="w-full p-2 border rounded"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                          <option key={i} value={i}>
                            {i}x de {formatCurrency(cartTotal / i)}
                            {i === 1 ? " à vista" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button 
              onClick={handleCheckout}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Processando..." : `Finalizar Pagamento - ${formatCurrency(cartTotal)}`}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Checkout;
