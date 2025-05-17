
import React, { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { toast } = useToast();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        // Get order details from Supabase
        const { data: order, error } = await supabase
          .from("orders")
          .select(`
            id,
            total_amount,
            created_at,
            order_items (
              quantity,
              price_per_unit,
              product:products (
                name
              )
            )
          `)
          .eq("stripe_session_id", sessionId)
          .single();

        if (error) throw error;
        
        // Update order status to "paid"
        await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("stripe_session_id", sessionId);

        setOrderDetails(order);
      } catch (error) {
        console.error("Error fetching order details:", error);
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
  }, [sessionId, toast]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        <p className="mt-4 text-lg">Processando seu pagamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold mt-4">Pagamento confirmado!</h1>
          <p className="text-muted-foreground mt-2">
            Seu pedido foi processado com sucesso.
          </p>
        </div>

        {orderDetails && (
          <div className="border rounded-md p-4 mb-6">
            <h2 className="font-semibold text-lg mb-2">Detalhes do Pedido</h2>
            <p className="text-sm text-muted-foreground">ID: {orderDetails.id.substring(0, 8)}...</p>
            <p className="text-sm text-muted-foreground">Data: {formatDate(orderDetails.created_at)}</p>
            
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
              
              <div className="pt-2 border-t mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(orderDetails.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-3">
          <Button asChild className="w-full">
            <Link to="/my-bookings">Ver minhas reservas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Voltar para a página inicial</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
