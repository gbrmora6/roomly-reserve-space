
import React, { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/**
 * PÁGINA DE SUCESSO DO PAGAMENTO
 * 
 * Esta página é exibida quando um pagamento é confirmado com sucesso.
 * Pode ser acessada de duas formas:
 * 
 * 1. Redirecionamento automático do Click2Pay (para cartão aprovado imediatamente)
 * 2. Redirecionamento manual após confirmação de PIX/boleto via webhook
 * 
 * Funcionalidades:
 * - Buscar e exibir detalhes completos do pedido pago
 * - Mostrar resumo dos itens comprados
 * - Exibir valor total e informações de pagamento
 * - Fornecer links para navegação (meus pedidos, página inicial)
 * - Tratar casos de erro na busca dos dados
 * 
 * O ID do pedido é passado via query parameter "order_id"
 */
const PaymentSuccess: React.FC = () => {
  // Hook para acessar parâmetros da URL
  const [searchParams] = useSearchParams();
  
  // Extrair ID do pedido da URL (ex: /payment-success?order_id=123)
  const orderId = searchParams.get("order_id");
  
  const { toast } = useToast();
  
  // Estados para controlar dados e loading
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /**
   * EFEITO PARA BUSCAR DETALHES DO PEDIDO
   * 
   * Executa ao montar componente e quando orderId muda
   * Busca informações completas do pedido incluindo itens e produtos
   */
  useEffect(() => {
    const fetchOrderDetails = async () => {
      // Se não há orderId, não há o que buscar
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        /**
         * CONSULTA COMPLEXA COM JOINS
         * 
         * Busca dados do pedido com:
         * - Informações básicas: id, total, data, status
         * - Itens do pedido: quantidade e preço por unidade
         * - Dados dos produtos: nome de cada item
         * 
         * Usa Supabase query builder para fazer join automático
         */
        const { data: order, error } = await supabase
          .from("orders")
          .select(`
            id,
            total_amount,
            created_at,
            status,
            order_items (
              quantity,
              price_per_unit,
              product:products (
                name
              )
            )
          `)
          .eq("id", orderId) // Filtrar pelo ID específico
          .single(); // Esperar apenas um resultado

        // Verificar se houve erro na consulta
        if (error) throw error;
        
        // Armazenar dados do pedido no estado
        setOrderDetails(order);
        
      } catch (error) {
        // Log do erro para debugging
        console.error("Erro ao buscar detalhes do pedido:", error);
        
        // Mostrar erro amigável para o usuário
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível obter os detalhes do pedido.",
        });
      } finally {
        // Sempre desabilitar loading, independente do resultado
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, toast]);

  /**
   * FUNÇÃO PARA FORMATAÇÃO DE MOEDA
   * 
   * Converte valores numéricos para formato brasileiro (R$ 123,45)
   * @param value - Valor numérico a ser formatado
   * @returns String formatada como moeda brasileira
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  /**
   * FUNÇÃO PARA FORMATAÇÃO DE DATA
   * 
   * Converte string de data ISO para formato brasileiro (DD/MM/AAAA)
   * @param dateString - String de data em formato ISO
   * @returns String formatada como data brasileira
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  /**
   * ESTADO DE LOADING
   * 
   * Exibe spinner e mensagem enquanto busca dados do pedido
   */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        {/* Spinner animado */}
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        <p className="mt-4 text-lg">Carregando detalhes do pagamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-8">
        
        {/* 
          SEÇÃO DE CONFIRMAÇÃO
          Ícone de sucesso e mensagem de confirmação
        */}
        <div className="text-center mb-6">
          {/* Ícone de check verde para indicar sucesso */}
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold mt-4">Pagamento confirmado!</h1>
          <p className="text-muted-foreground mt-2">
            Seu pedido foi processado com sucesso.
          </p>
        </div>

        {/* 
          DETALHES DO PEDIDO
          Exibido apenas se conseguiu carregar os dados
        */}
        {orderDetails && (
          <div className="border rounded-md p-4 mb-6">
            <h2 className="font-semibold text-lg mb-2">Detalhes do Pedido</h2>
            
            {/* Informações básicas do pedido */}
            <p className="text-sm text-muted-foreground">
              ID: {orderDetails.id.substring(0, 8)}...
            </p>
            <p className="text-sm text-muted-foreground">
              Data: {formatDate(orderDetails.created_at)}
            </p>
            <p className="text-sm text-muted-foreground">
              Status: {orderDetails.status === 'paid' ? 'Pago' : 'Pendente'}
            </p>
            
            {/* 
              LISTA DE ITENS COMPRADOS
              Mostra cada produto com quantidade e valor
            */}
            <div className="mt-4 space-y-2">
              <h3 className="font-semibold">Itens:</h3>
              <ul className="space-y-1">
                {orderDetails.order_items.map((item: any, index: number) => (
                  <li key={index} className="text-sm flex justify-between">
                    <span>
                      {item.quantity}x {item.product?.name || "Produto"}
                    </span>
                    <span>{formatCurrency(item.price_per_unit * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              
              {/* 
                TOTAL DO PEDIDO
                Linha destacada com valor total pago
              */}
              <div className="pt-2 border-t mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(orderDetails.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 
          BOTÕES DE NAVEGAÇÃO
          Permitem ao usuário continuar navegando no site
        */}
        <div className="flex flex-col space-y-3">
          {/* Botão principal: ver histórico de pedidos */}
          <Button asChild className="w-full">
            <Link to="/my-bookings">Ver meus pedidos</Link>
          </Button>
          
          {/* Botão secundário: voltar à página inicial */}
          <Button asChild variant="outline">
            <Link to="/">Voltar para a página inicial</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
