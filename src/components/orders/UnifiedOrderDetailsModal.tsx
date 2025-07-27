import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, Package, Users, CreditCard } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { UnifiedOrder } from "@/hooks/useUnifiedOrders";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UnifiedOrderDetailsModalProps {
  order: UnifiedOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

const getPaymentMethodLabel = (method?: string) => {
  switch (method) {
    case "pix":
      return "PIX";
    case "cartao":
      return "Cartão de Crédito";
    case "boleto":
      return "Boleto";
    default:
      return method || "Não informado";
  }
};

export const UnifiedOrderDetailsModal: React.FC<UnifiedOrderDetailsModalProps> = ({
  order,
  open,
  onOpenChange,
}) => {
  if (!order) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatTimeRange = (start: string, end: string) => {
    const startTime = format(new Date(start), "HH:mm");
    const endTime = format(new Date(end), "HH:mm");
    return `${startTime} - ${endTime}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Pedido #{order.id.slice(-8)}</span>
            {getStatusBadge(order.status, order.refund_status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Informações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data do Pedido</p>
                  <p className="font-medium">{formatDate(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-medium text-lg">{formatCurrency(order.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pagamento</p>
                  <p className="font-medium">{getPaymentMethodLabel(order.payment_method)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(order.status, order.refund_status)}
                </div>
              </div>
              
              {order.refund_amount && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-700">
                    <strong>Valor Estornado:</strong> {formatCurrency(order.refund_amount)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Produtos */}
          {order.order_items && order.order_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Produtos Adquiridos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.order_items.map((item, index) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">Quantidade: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.price_per_unit * item.quantity)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.price_per_unit)} cada
                        </p>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between items-center font-medium">
                    <span>Total dos Produtos:</span>
                    <span>
                      {formatCurrency(
                        order.order_items.reduce((sum, item) => sum + (item.price_per_unit * item.quantity), 0)
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reservas de Salas */}
          {order.bookings && order.bookings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Reservas de Salas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.bookings.map((booking) => (
                    <div key={booking.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <p className="font-medium">{booking.room.name}</p>
                          {booking.room.description && (
                            <p className="text-sm text-muted-foreground">{booking.room.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(booking.start_time)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatTimeRange(booking.start_time, booking.end_time)}
                            </div>
                          </div>
                          <Badge variant="outline" className="w-fit">
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(booking.total_price)}</p>
                          <p className="text-sm text-muted-foreground">Custo da sala</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between items-center font-medium">
                    <span>Total das Salas:</span>
                    <span>
                      {formatCurrency(
                        order.bookings.reduce((sum, booking) => sum + booking.total_price, 0)
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reservas de Equipamentos */}
          {order.booking_equipment && order.booking_equipment.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Reservas de Equipamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.booking_equipment.map((equipment) => (
                    <div key={equipment.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <p className="font-medium">{equipment.equipment.name}</p>
                          {equipment.equipment.description && (
                            <p className="text-sm text-muted-foreground">{equipment.equipment.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(equipment.start_time)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatTimeRange(equipment.start_time, equipment.end_time)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-fit">
                              {equipment.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Quantidade: {equipment.quantity}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(equipment.total_price)}</p>
                          <p className="text-sm text-muted-foreground">Custo do equipamento</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between items-center font-medium">
                    <span>Total dos Equipamentos:</span>
                    <span>
                      {formatCurrency(
                        order.booking_equipment.reduce((sum, equipment) => sum + equipment.total_price, 0)
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};