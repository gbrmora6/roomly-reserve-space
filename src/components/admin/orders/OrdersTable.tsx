import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefundButton } from "@/components/admin/RefundButton";
import { OrderDetailsModal } from "./OrderDetailsModal";
import { Eye } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  refund_status: string | null;
  order_items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    price_per_unit: number;
    product: {
      name: string;
      price: number;
    };
  }>;
  bookings: Array<{
    id: string;
    room_id: string;
    start_time: string;
    end_time: string;
    total_price: number;
    room: {
      name: string;
    };
  }>;
  booking_equipment: Array<{
    id: string;
    equipment_id: string;
    quantity: number;
    start_time: string;
    end_time: string;
    total_price: number;
    equipment: {
      name: string;
    };
  }>;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const OrdersTable: React.FC = () => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            *,
            product:products(name, price)
          ),
          bookings(
            *,
            room:rooms(name)
          ),
          booking_equipment(
            *,
            equipment:equipment(name)
          ),
          profiles!fk_orders_profiles(first_name, last_name, email)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Order[];
    },
    refetchInterval: 30000,
  });

  const getStatusBadge = (status: string, refundStatus?: string | null) => {
    if (refundStatus === "completed") {
      return <Badge variant="destructive">Estornado</Badge>;
    }
    if (refundStatus === "processing") {
      return <Badge variant="secondary">Processando Estorno</Badge>;
    }
    if (refundStatus === "partial") {
      return <Badge variant="outline">Parcialmente Devolvido</Badge>;
    }

    switch (status) {
      case "paid":
        return <Badge variant="default">Pago</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "pix":
        return "PIX";
      case "cartao":
        return "Cartão de Crédito";
      case "boleto":
        return "Boleto";
      default:
        return method;
    }
  };

  const getOrderItemsSummary = (order: Order) => {
    const items: string[] = [];
    
    if (order.bookings?.length > 0) {
      items.push(`${order.bookings.length} sala(s)`);
    }
    
    if (order.booking_equipment?.length > 0) {
      items.push(`${order.booking_equipment.length} equipamento(s)`);
    }
    
    if (order.order_items?.length > 0) {
      items.push(`${order.order_items.length} produto(s)`);
    }

    return items.join(", ") || "Nenhum item";
  };

  const canRefund = (order: Order) => {
    return order.status === "paid" && !order.refund_status;
  };

  const handleOrderRefundSuccess = () => {
    refetch();
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando pedidos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Todos os Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {order.profiles?.first_name} {order.profiles?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.profiles?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{getOrderItemsSummary(order)}</div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(order.total_amount)}
                  </TableCell>
                  <TableCell>
                    {getPaymentMethodLabel(order.payment_method || "")}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.status, order.refund_status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canRefund(order) && (
                        <RefundButton
                          orderId={order.id}
                          paymentMethod={order.payment_method}
                          status={order.status}
                          onRefundSuccess={handleOrderRefundSuccess}
                          size="sm"
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
        />
      )}
    </>
  );
};