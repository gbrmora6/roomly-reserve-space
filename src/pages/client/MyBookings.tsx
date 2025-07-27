
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { useUnifiedOrders } from "@/hooks/useUnifiedOrders";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import { PageHeader } from "@/components/shared/PageHeader";
import { CompanyAddressDialog } from "./components/CompanyAddressDialog";
import { LoadingBookings } from "@/components/bookings/LoadingBookings";
import { UnifiedOrderDetailsModal } from "@/components/orders/UnifiedOrderDetailsModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, ShoppingCart, MapPin, TrendingUp, Clock, Table, HardDrive, Eye, RefreshCw, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { UnifiedOrder } from "@/hooks/useUnifiedOrders";

const MyBookings = () => {
  const { user } = useAuth();
  // Removido activeTab - agora é uma aba única
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const {
    allOrders,
    productOrders,
    roomOrders,
    equipmentOrders,
    isLoading,
    checkPaymentStatus,
    requestRefund
  } = useUnifiedOrders(user?.id);

  const {
    companyProfile,
    showAddressDialog,
    setShowAddressDialog,
    handleShowAddress
  } = useCompanyProfile();

  const handleViewDetails = (order: UnifiedOrder) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleRefreshStatus = (orderId: string) => {
    checkPaymentStatus.mutate(orderId);
  };

  const handleRequestRefund = (orderId: string, reason?: string) => {
    requestRefund.mutate({ orderId, reason });
  };

  // Show loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <LoadingBookings />
        </div>
      </MainLayout>
    );
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const getStatusBadge = (status: string, refundStatus?: string) => {
    if (refundStatus === "refunded") {
      return <Badge variant="destructive">Estornado</Badge>;
    }
    
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-green-500">Pago</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      case "processing":
        return <Badge variant="outline">Processando</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const OrderCard = ({ order, type }: { order: UnifiedOrder; type: "products" | "rooms" | "equipment" }) => {
    const getOrderSummary = () => {
      if (type === "products" && order.order_items) {
        const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
        return `${itemCount} ${itemCount === 1 ? 'produto' : 'produtos'}`;
      }
      if (type === "rooms" && order.bookings) {
        return `${order.bookings.length} ${order.bookings.length === 1 ? 'sala reservada' : 'salas reservadas'}`;
      }
      if (type === "equipment" && order.booking_equipment) {
        const totalQty = order.booking_equipment.reduce((sum, eq) => sum + eq.quantity, 0);
        return `${totalQty} ${totalQty === 1 ? 'equipamento' : 'equipamentos'}`;
      }
      return "Pedido";
    };

    const canRefund = order.status === "paid" && !order.refund_status;

    return (
      <Card className="border-border/50 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">Pedido #{order.id.slice(-8)}</h3>
                  {getStatusBadge(order.status, order.refund_status)}
                </div>
                <p className="text-sm text-muted-foreground">{getOrderSummary()}</p>
                <p className="text-sm text-muted-foreground">Data: {formatDate(order.created_at)}</p>
              </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatCurrency(order.total_amount)}</p>
              {order.payment_method && (
                <p className="text-sm text-muted-foreground">
                  {order.payment_method === "pix" ? "PIX" : 
                   order.payment_method === "cartao" ? "Cartão" : 
                   order.payment_method === "boleto" ? "Boleto" : order.payment_method}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(order)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver Detalhes
            </Button>
            
            {order.status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRefreshStatus(order.id)}
                disabled={checkPaymentStatus.isPending}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${checkPaymentStatus.isPending ? 'animate-spin' : ''}`} />
                Atualizar Status
              </Button>
            )}
            
            {canRefund && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRequestRefund(order.id)}
                disabled={requestRefund.isPending}
                className="text-red-600 hover:text-red-700"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Solicitar Estorno
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ type }: { type: "products" | "rooms" | "equipment" }) => {
    const getEmptyMessage = () => {
      switch (type) {
        case "products":
          return "Nenhum pedido de produto encontrado";
        case "rooms":
          return "Nenhuma reserva de sala encontrada";
        case "equipment":
          return "Nenhuma reserva de equipamento encontrada";
      }
    };

    const getIcon = () => {
      switch (type) {
        case "products":
          return <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />;
        case "rooms":
          return <Table className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />;
        case "equipment":
          return <HardDrive className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />;
      }
    };

    return (
      <Card className="border-border/30">
        <CardContent className="text-center py-16">
          {getIcon()}
          <h3 className="text-lg font-medium mb-2">{getEmptyMessage()}</h3>
          <p className="text-muted-foreground mb-6">
            Quando você fizer um pedido, ele aparecerá aqui.
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <PageHeader 
          title="Meus Pedidos"
          description="Acompanhe seus pedidos e reservas em tempo real"
        >
          <Button
            variant="outline"
            onClick={handleShowAddress}
          >
            <MapPin className="mr-2 h-4 w-4" />
            Endereço da Empresa
          </Button>
        </PageHeader>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{allOrders.length}</p>
                  <p className="text-sm text-muted-foreground">Pedidos Totais</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roomOrders.length + equipmentOrders.length}</p>
                  <p className="text-sm text-muted-foreground">Reservas Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {allOrders.filter(o => o.status === 'paid').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Pedidos Pagos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Todos os Pedidos</h2>
              <Badge variant="secondary" className="text-sm">
                {allOrders.length} {allOrders.length === 1 ? 'pedido' : 'pedidos'}
              </Badge>
            </div>
            
            <div className="space-y-4">
              {allOrders.length > 0 ? (
                allOrders.map((order) => {
                  // Determinar tipo do pedido baseado no conteúdo
                  const type = order.order_items?.length > 0 ? 'products' : 
                               order.bookings?.length > 0 ? 'rooms' : 'equipment';
                  return (
                    <OrderCard key={order.id} order={order} type={type} />
                  );
                })
              ) : (
                <Card className="border-border/30">
                  <CardContent className="text-center py-16">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Nenhum pedido encontrado</h3>
                    <p className="text-muted-foreground mb-6">
                      Quando você fizer um pedido, ele aparecerá aqui.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        <CompanyAddressDialog
          open={showAddressDialog}
          onOpenChange={setShowAddressDialog}
          companyProfile={companyProfile}
        />

        <UnifiedOrderDetailsModal
          order={selectedOrder}
          open={showDetailsModal}
          onOpenChange={setShowDetailsModal}
        />
      </div>
    </MainLayout>
  );
};

export default MyBookings;
