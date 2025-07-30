
import React, { useEffect, useState } from "react";
import { CheckCircle, Receipt, Home, Download, Banknote, CreditCard, QrCode, FileText } from "lucide-react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseStoredDateTime } from "@/utils/timezone";
import { formatCurrency } from "@/utils/formatCurrency";
import MainLayout from "@/components/layout/MainLayout";

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const orderId = searchParams.get("order_id");
  const { toast } = useToast();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Get payment data from location state (for cash and other payments)
  const state = location.state || {};
  const paymentMethod = state.paymentMethod || 'unknown';

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        // Buscar detalhes do pedido
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
          .eq("id", orderId)
          .single();

        if (error) throw error;
        
        setOrderDetails(order);
      } catch (error) {
        console.error("Erro ao buscar detalhes do pedido:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível obter os detalhes do pedido.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, toast]);

  const getPaymentMethodDisplay = (method: string) => {
    const icons = {
      'pix': QrCode,
      'cartao': CreditCard,
      'boleto': FileText,
      'dinheiro': Banknote
    };
    
    const labels = {
      'pix': 'PIX',
      'cartao': 'Cartão de Crédito',
      'boleto': 'Boleto Bancário',
      'dinheiro': 'Pagamento em Dinheiro'
    };
    
    return {
      icon: icons[method as keyof typeof icons] || CreditCard,
      label: labels[method as keyof typeof labels] || 'Não informado'
    };
  };

  const getSuccessMessage = (method: string) => {
    switch (method) {
      case 'dinheiro':
        return {
          title: 'Pagamento em Dinheiro Confirmado!',
          description: 'Seu pagamento foi registrado com sucesso pelo administrador.'
        };
      case 'pix':
        return {
          title: 'Pagamento PIX Confirmado!',
          description: 'Seu pagamento foi processado e confirmado instantaneamente.'
        };
      case 'cartao':
        return {
          title: 'Pagamento Aprovado!',
          description: 'Seu cartão foi processado com sucesso.'
        };
      default:
        return {
          title: 'Pagamento Confirmado!',
          description: 'Seu pagamento foi processado com sucesso.'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return parseStoredDateTime(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        <p className="mt-4 text-lg">Carregando detalhes do pagamento...</p>
      </div>
    );
  }

  const successInfo = getSuccessMessage(paymentMethod);
  const paymentInfo = getPaymentMethodDisplay(paymentMethod);
  const PaymentIcon = paymentInfo.icon;

  return (
    <MainLayout>
      <div className="container mx-auto py-12 max-w-2xl">
        <Card className="shadow-lg border-green-200">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-800">
              {successInfo.title}
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              {successInfo.description}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Método de Pagamento:</span>
                <div className="flex items-center gap-2">
                  <PaymentIcon className="w-4 h-4" />
                  <span className="font-medium">{paymentInfo.label}</span>
                </div>
              </div>

              {(state.amount || orderDetails?.total_amount) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Valor:</span>
                  <span className="font-medium text-lg">
                    {formatCurrency(state.amount || orderDetails.total_amount)}
                  </span>
                </div>
              )}

              {state.transactionId && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">ID da Transação:</span>
                  <span className="font-mono text-sm">{state.transactionId}</span>
                </div>
              )}

              {(state.orderId || orderDetails?.id) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Número do Pedido:</span>
                  <span className="font-mono text-sm">
                    {(state.orderId || orderDetails.id)?.substring(0, 8)}...
                  </span>
                </div>
              )}

              {state.authorizationCode && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Código de Autorização:</span>
                  <span className="font-mono text-sm">{state.authorizationCode}</span>
                </div>
              )}
            </div>

            {paymentMethod === 'dinheiro' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Importante</span>
                </div>
                <p className="text-sm text-blue-700">
                  Seu pagamento em dinheiro foi confirmado pelo administrador. 
                  As reservas foram ativadas e os produtos foram separados.
                </p>
              </div>
            )}

            {orderDetails && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Detalhes do Pedido</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Data:</span> {parseStoredDateTime(orderDetails.created_at).toLocaleDateString('pt-BR')}</p>
                  <p><span className="text-muted-foreground">Status:</span> {orderDetails.status === 'paid' ? 'Pago' : 'Pendente'}</p>
                </div>
                
                {orderDetails.order_items && orderDetails.order_items.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold">Itens:</h4>
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
                    
                    <div className="pt-2 border-t mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>{formatCurrency(orderDetails.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild className="flex-1">
                <Link to="/client/my-bookings">
                  <Receipt className="w-4 h-4 mr-2" />
                  Ver Minhas Reservas
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="flex-1">
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Link>
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Você receberá um e-mail de confirmação em breve com todos os detalhes da sua compra.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PaymentSuccess;
