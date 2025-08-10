import React, { useState, useMemo } from "react";
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
import { OrdersFilters } from "./OrdersFilters";
import { Eye } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CancelCashButton } from "@/components/admin/CancelCashButton";

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
  
  // Filtros
  const [clientSearch, setClientSearch] = useState("");
  const [orderIdSearch, setOrderIdSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<Date | null>(null);

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      console.log("🔍 Fazendo consulta de pedidos...");
      
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
      
      if (error) {
        console.error("❌ Erro ao buscar pedidos:", error);
        throw error;
      }
      
      console.log("✅ Pedidos carregados:", data?.length || 0, "pedidos");
      console.log("📄 Dados completos:", data);
      
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

  const handleOrderCancelSuccess = () => {
    refetch();
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsModalOpen(true);
  };

  const handleClearFilters = () => {
    setClientSearch("");
    setOrderIdSearch("");
    setStatusFilter("all");
    setPaymentMethodFilter("all");
    setDateFilter(null);
  };

  // Filtrar pedidos
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    return orders.filter(order => {
      // Filtro por cliente
      if (clientSearch) {
        const clientName = `${order.profiles?.first_name || ''} ${order.profiles?.last_name || ''}`.toLowerCase();
        const clientEmail = order.profiles?.email?.toLowerCase() || '';
        const searchTerm = clientSearch.toLowerCase();
        
        if (!clientName.includes(searchTerm) && !clientEmail.includes(searchTerm)) {
          return false;
        }
      }
      
      // Filtro por ID do pedido
      if (orderIdSearch) {
        if (!order.id.toLowerCase().includes(orderIdSearch.toLowerCase())) {
          return false;
        }
      }
      
      // Filtro por status
      if (statusFilter !== "all") {
        if (order.status !== statusFilter) {
          return false;
        }
      }
      
      // Filtro por forma de pagamento
      if (paymentMethodFilter !== "all") {
        if (order.payment_method !== paymentMethodFilter) {
          return false;
        }
      }
      
      // Filtro por data
      if (dateFilter) {
        if (!isSameDay(new Date(order.created_at), dateFilter)) {
          return false;
        }
      }
      
      return true;
    });
  }, [orders, clientSearch, orderIdSearch, statusFilter, paymentMethodFilter, dateFilter]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando pedidos...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error("❌ Erro na renderização da tabela:", error);
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Erro ao carregar pedidos:</p>
            <p className="text-sm mt-2">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <OrdersFilters
        clientSearch={clientSearch}
        setClientSearch={setClientSearch}
        orderIdSearch={orderIdSearch}
        setOrderIdSearch={setOrderIdSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        paymentMethodFilter={paymentMethodFilter}
        setPaymentMethodFilter={setPaymentMethodFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        onClearFilters={handleClearFilters}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>
            Todos os Pedidos 
            {filteredOrders.length !== orders.length && (
              <span className="text-sm text-muted-foreground ml-2">
                ({filteredOrders.length} de {orders.length})
              </span>
            )}
          </CardTitle>
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
              {filteredOrders.map((order) => (
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
                      {/* Botão de cancelar para pedidos em dinheiro pagos */}
                      {order.status === "paid" && (order.payment_method || "").toLowerCase() === "dinheiro" && (
                        <CancelCashButton
                          orderId={order.id}
                          paymentMethod={order.payment_method}
                          status={order.status}
                          onCancelSuccess={handleOrderCancelSuccess}
                          size="sm"
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {orders.length === 0 ? "Nenhum pedido encontrado" : "Nenhum pedido corresponde aos filtros"}
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