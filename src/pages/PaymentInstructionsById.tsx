
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, FileText, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import PixQRCode from "@/components/checkout/PixQRCode";

interface PaymentDetailsData {
  order_id: string;
  payment_method: string;
  pix_code?: string;
  pix_qr_code?: string;
  pix_expiration?: string;
  boleto_url?: string;
  boleto_barcode?: string;
  boleto_due_date?: string;
  card_transaction_id?: string;
  card_authorization_code?: string;
}

interface OrderData {
  id: string;
  total_amount: number;
  status: string;
  expires_at?: string;
  click2pay_tid?: string;
  external_identifier?: string;
}

const PaymentInstructionsById: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetailsData | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!orderId) {
      navigate("/");
      return;
    }

    fetchPaymentData();
  }, [orderId, navigate]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);

      // Buscar dados do pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error("Erro ao buscar pedido:", orderError);
        toast({
          title: "Erro",
          description: "Pedido não encontrado",
          variant: "destructive"
        });
        navigate("/");
        return;
      }

      // Buscar detalhes do pagamento
      const { data: payment, error: paymentError } = await supabase
        .from('payment_details')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (paymentError) {
        console.error("Erro ao buscar detalhes do pagamento:", paymentError);
        toast({
          title: "Erro",
          description: "Detalhes do pagamento não encontrados",
          variant: "destructive"
        });
        navigate("/");
        return;
      }

      setOrderData(order);
      setPaymentDetails(payment);

      // Verificar se está expirado
      if (order.expires_at) {
        const expirationDate = new Date(order.expires_at);
        const now = new Date();
        setIsExpired(now > expirationDate);
      }

    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do pagamento",
        variant: "destructive"
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Código copiado para a área de transferência.",
    });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando dados do pagamento...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!paymentDetails || !orderData) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Dados de pagamento não encontrados</h1>
            <Button asChild>
              <Link to="/my-bookings">Voltar aos meus pedidos</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Verificar se o pagamento já foi processado
  if (orderData.status === 'paid') {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Pagamento já processado</h1>
            <p className="text-muted-foreground mb-6">
              Este pedido já foi pago e processado.
            </p>
            <Button asChild>
              <Link to="/my-bookings">Voltar aos meus pedidos</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Verificar se está expirado
  if (isExpired) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Pagamento expirado</h1>
            <p className="text-muted-foreground mb-6">
              O prazo para pagamento deste pedido expirou.
            </p>
            <Button asChild>
              <Link to="/my-bookings">Voltar aos meus pedidos</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {paymentDetails.payment_method === "pix" && (
            <PixQRCode
              qrCodeImage={paymentDetails.pix_qr_code}
              pixCode={paymentDetails.pix_code}
              reference={orderData.external_identifier}
              orderId={orderId}
            />
          )}

          {paymentDetails.payment_method === "boleto" && (
            <Card>
              <CardHeader className="text-center">
                <FileText className="mx-auto h-16 w-16 text-orange-500 mb-4" />
                <CardTitle>Pagamento via Boleto</CardTitle>
                <p className="text-muted-foreground">
                  Use a linha digitável para pagar o boleto
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentDetails.boleto_barcode && (
                  <div>
                    <p className="text-sm font-medium mb-2">Código de Barras:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paymentDetails.boleto_barcode}
                        readOnly
                        className="flex-1 p-2 text-xs border rounded bg-muted font-mono"
                      />
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(paymentDetails.boleto_barcode!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {paymentDetails.boleto_url && (
                  <Button asChild className="w-full">
                    <a href={paymentDetails.boleto_url} target="_blank" rel="noopener noreferrer">
                      Baixar Boleto PDF
                    </a>
                  </Button>
                )}

                {paymentDetails.boleto_due_date && (
                  <div className="text-center">
                    <p className="text-sm">
                      <strong>Vencimento:</strong> {new Date(paymentDetails.boleto_due_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}

                <div className="text-center text-sm text-muted-foreground">
                  <p>Pague o boleto em qualquer banco, lotérica ou internet banking.</p>
                  <p className="mt-2">Pedido: {orderId}</p>
                  <p>Valor: R$ {orderData.total_amount.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 flex flex-col space-y-3">
            <Button asChild variant="outline">
              <Link to="/my-bookings">Ver meus pedidos</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Voltar para a página inicial</Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PaymentInstructionsById;
