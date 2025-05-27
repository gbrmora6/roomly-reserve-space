
import React, { useState } from "react";
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

/**
 * PÁGINA DE CHECKOUT - FINALIZAÇÃO DE COMPRA
 * 
 * Esta página permite ao usuário finalizar a compra dos itens no carrinho
 * integrando com o sistema de pagamento Click2Pay.
 * 
 * Funcionalidades:
 * - Exibir resumo do pedido com itens e total
 * - Coletar dados pessoais necessários para o pagamento
 * - Permitir seleção do método de pagamento (PIX, boleto, cartão)
 * - Coletar dados específicos do cartão de crédito quando necessário
 * - Processar pagamento via Click2Pay integration
 * - Redirecionar para páginas de sucesso ou instruções de pagamento
 * 
 * Fluxo de pagamento:
 * 1. Validar dados obrigatórios
 * 2. Chamar edge function click2pay-integration
 * 3. Para cartão: redirecionar para success se aprovado
 * 4. Para PIX/boleto: redirecionar para página de instruções
 * 5. Limpar carrinho após processamento bem-sucedido
 */
const Checkout = () => {
  // Hooks para autenticação e navegação
  const { user } = useAuth(); // Dados do usuário logado
  const navigate = useNavigate(); // Navegação programática
  const { toast } = useToast(); // Notificações toast
  
  // Hook do carrinho para acessar itens e total
  const { cartItems, cartTotal, clearCart } = useCart();
  
  // Estado para método de pagamento selecionado
  // Valores possíveis: "pix", "boleto", "cartao"
  const [paymentMethod, setPaymentMethod] = useState("pix");
  
  // Estado para controlar loading durante processamento
  const [loading, setLoading] = useState(false);
  
  /**
   * ESTADO DOS DADOS DE PAGAMENTO
   * 
   * Armazena todas as informações necessárias para processar o pagamento:
   * - Dados pessoais: nome, CPF/CNPJ, telefone
   * - Dados do cartão: número, nome, validade, CVV, parcelas
   */
  const [paymentData, setPaymentData] = useState({
    // Dados pessoais obrigatórios
    nomeCompleto: "",
    cpfCnpj: "",
    telefone: "",
    
    // Dados específicos do cartão de crédito
    numeroCartao: "",
    nomeNoCartao: "",
    validadeCartao: "", // Formato MM/AAAA
    cvv: "",
    parcelas: 1 // Número de parcelas (1 a 12)
  });

  /**
   * VALIDAÇÕES DE ACESSO
   * 
   * Redireciona usuário se não estiver logado ou carrinho vazio
   */
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (cartItems.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  /**
   * FUNÇÃO PARA ATUALIZAR DADOS DE PAGAMENTO
   * 
   * Atualiza campos do formulário de forma controlada
   * @param field - Nome do campo a ser atualizado
   * @param value - Novo valor do campo
   */
  const handlePaymentDataChange = (field: string, value: string | number) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * FUNÇÃO PRINCIPAL DE CHECKOUT
   * 
   * Processa o pagamento enviando dados para a integração Click2Pay
   * e gerencia redirecionamentos baseados no método de pagamento
   */
  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      // Preparar dados dos produtos do carrinho
      const productIds = cartItems.map(item => item.item_id);
      const quantities = cartItems.map(item => item.quantity);

      /**
       * CHAMADA PARA EDGE FUNCTION CLICK2PAY
       * 
       * Envia todos os dados necessários para criar o pagamento:
       * - IDs e quantidades dos produtos
       * - Método de pagamento selecionado
       * - Dados pessoais e do cartão (se aplicável)
       */
      const { data, error } = await supabase.functions.invoke('click2pay-integration', {
        body: {
          action: 'create-checkout', // Ação para criar checkout completo
          userId: user.id, // ID do usuário logado
          productIds, // Array com IDs dos produtos
          quantities, // Array com quantidades correspondentes
          paymentMethod, // Método selecionado (pix/boleto/cartao)
          paymentData // Dados do formulário
        }
      });

      // Verificar se houve erro na requisição
      if (error) throw error;

      // Verificar se a operação foi bem-sucedida
      if (!data.success) {
        throw new Error(data.error || "Erro no processamento do pagamento");
      }

      // Limpar carrinho após processamento bem-sucedido
      // Importante fazer isso antes dos redirecionamentos
      clearCart();

      /**
       * REDIRECIONAMENTO BASEADO NO MÉTODO DE PAGAMENTO
       * 
       * Cartão de crédito: processamento imediato
       * - Se aprovado: página de sucesso
       * - Se recusado: mostrar erro
       * 
       * PIX/Boleto: requer ação do usuário
       * - Redireciona para página de instruções com dados de pagamento
       */
      if (paymentMethod === "cartao") {
        // Cartão de crédito tem processamento imediato
        if (data.status === "paid") {
          toast({
            title: "Pagamento aprovado!",
            description: "Seu pagamento foi processado com sucesso.",
          });
          navigate("/payment-success");
        } else {
          // Cartão foi recusado ou houve erro
          throw new Error(data.message || "Cartão recusado");
        }
      } else {
        /**
         * PIX E BOLETO - REDIRECIONAMENTO PARA INSTRUÇÕES
         * 
         * Estes métodos requerem ação do usuário:
         * - PIX: escanear QR code ou copiar código
         * - Boleto: pagar linha digitável ou baixar PDF
         * 
         * Os dados de pagamento são passados via state para a próxima página
         */
        navigate("/payment-instructions", { 
          state: { 
            paymentMethod, // Método selecionado para exibir instruções corretas
            paymentData: data, // Dados retornados pelo Click2Pay (QR code, linha digitável, etc.)
            orderId: data.orderId // ID do pedido para referência
          } 
        });
      }

    } catch (error) {
      // Log e exibição de erros para o usuário
      console.error("Erro no checkout:", error);
      toast({
        variant: "destructive",
        title: "Erro no pagamento",
        description: error.message || "Ocorreu um erro ao processar o pagamento",
      });
    } finally {
      // Sempre desabilitar loading, independente do resultado
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>

          <div className="space-y-6">
            {/* 
              SEÇÃO 1: RESUMO DO PEDIDO
              Exibe lista de itens no carrinho com quantidades e valores
              Calcula e mostra o total da compra
            */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Listar cada item do carrinho */}
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.quantity}x Produto</span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  
                  {/* Linha separadora e total */}
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 
              SEÇÃO 2: DADOS PESSOAIS
              Coleta informações obrigatórias para processamento do pagamento
              Estes dados são enviados para o Click2Pay junto com o pedido
            */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campo: Nome Completo */}
                <div>
                  <Label htmlFor="nomeCompleto">Nome Completo</Label>
                  <Input
                    id="nomeCompleto"
                    value={paymentData.nomeCompleto}
                    onChange={(e) => handlePaymentDataChange("nomeCompleto", e.target.value)}
                    required
                    placeholder="Digite seu nome completo"
                  />
                </div>
                
                {/* Campo: CPF/CNPJ */}
                <div>
                  <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                  <Input
                    id="cpfCnpj"
                    value={paymentData.cpfCnpj}
                    onChange={(e) => handlePaymentDataChange("cpfCnpj", e.target.value)}
                    required
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  />
                </div>
                
                {/* Campo: Telefone */}
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={paymentData.telefone}
                    onChange={(e) => handlePaymentDataChange("telefone", e.target.value)}
                    required
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 
              SEÇÃO 3: MÉTODO DE PAGAMENTO
              Permite escolher entre PIX, boleto ou cartão de crédito
              Exibe campos específicos do cartão quando selecionado
            */}
            <Card>
              <CardHeader>
                <CardTitle>Método de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                {/* RadioGroup para seleção do método */}
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  {/* Opção PIX - Pagamento instantâneo */}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pix" id="pix" />
                    <Label htmlFor="pix">Pix (Pagamento instantâneo)</Label>
                  </div>
                  
                  {/* Opção Boleto - Pagamento em até 3 dias úteis */}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="boleto" id="boleto" />
                    <Label htmlFor="boleto">Boleto Bancário</Label>
                  </div>
                  
                  {/* Opção Cartão - Processamento imediato */}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cartao" id="cartao" />
                    <Label htmlFor="cartao">Cartão de Crédito</Label>
                  </div>
                </RadioGroup>

                {/* 
                  CAMPOS ESPECÍFICOS PARA CARTÃO DE CRÉDITO
                  Exibidos apenas quando método "cartao" está selecionado
                  Coleta dados necessários para processamento do cartão
                */}
                {paymentMethod === "cartao" && (
                  <div className="mt-4 space-y-4">
                    {/* Campo: Número do Cartão */}
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
                    
                    {/* Campo: Nome impresso no cartão */}
                    <div>
                      <Label htmlFor="nomeNoCartao">Nome no Cartão</Label>
                      <Input
                        id="nomeNoCartao"
                        value={paymentData.nomeNoCartao}
                        onChange={(e) => handlePaymentDataChange("nomeNoCartao", e.target.value)}
                        placeholder="Nome conforme impresso no cartão"
                        required
                      />
                    </div>
                    
                    {/* Linha com Validade e CVV */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Campo: Data de validade */}
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
                      
                      {/* Campo: Código de segurança */}
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
                    
                    {/* 
                      SELETOR DE PARCELAS
                      Permite escolher número de parcelas de 1x a 12x
                      Calcula e exibe valor de cada parcela automaticamente
                    */}
                    <div>
                      <Label htmlFor="parcelas">Parcelas</Label>
                      <select
                        id="parcelas"
                        value={paymentData.parcelas}
                        onChange={(e) => handlePaymentDataChange("parcelas", parseInt(e.target.value))}
                        className="w-full p-2 border rounded"
                      >
                        {/* Gerar opções de 1 a 12 parcelas */}
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

            {/* 
              BOTÃO DE FINALIZAÇÃO
              Processa o pagamento e inicia fluxo baseado no método selecionado
              Desabilitado durante processamento para evitar duplo clique
            */}
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
