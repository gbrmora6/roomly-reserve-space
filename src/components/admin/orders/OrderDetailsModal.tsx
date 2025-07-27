import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceUpload } from "@/components/admin/InvoiceUpload";
import { formatCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderDetailsModalProps {
  order: {
    id: string;
    user_id: string;
    total_amount: number;
    status: string;
    payment_method: string;
    created_at: string;
    refund_status: string | null;
    order_items?: Array<{
      id: string;
      product_id: string;
      quantity: number;
      price_per_unit: number;
      product: {
        name: string;
        price: number;
      };
    }>;
    bookings?: Array<{
      id: string;
      room_id: string;
      start_time: string;
      end_time: string;
      total_price: number;
      room: {
        name: string;
      };
    }>;
    booking_equipment?: Array<{
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
    invoice_url?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  open,
  onOpenChange,
}) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes do Pedido #{order.id.slice(0, 8)}
            {getStatusBadge(order.status, order.refund_status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <strong>Data do Pedido:</strong>
                <div>
                  {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
              </div>
              <div>
                <strong>Cliente:</strong>
                <div>
                  {order.profiles?.first_name} {order.profiles?.last_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {order.profiles?.email}
                </div>
              </div>
              <div>
                <strong>Método de Pagamento:</strong>
                <div>{getPaymentMethodLabel(order.payment_method || "")}</div>
              </div>
              <div>
                <strong>Valor Total:</strong>
                <div className="text-lg font-semibold">
                  {formatCurrency(order.total_amount)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reservas de Salas */}
          {order.bookings && order.bookings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Reservas de Salas ({order.bookings.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{booking.room.name}</h4>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(booking.start_time), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}{" "}
                            até{" "}
                            {format(new Date(booking.end_time), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(booking.total_price)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reservas de Equipamentos */}
          {order.booking_equipment && order.booking_equipment.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Reservas de Equipamentos ({order.booking_equipment.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.booking_equipment.map((booking) => (
                    <div
                      key={booking.id}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{booking.equipment.name}</h4>
                          <div className="text-sm text-muted-foreground">
                            Quantidade: {booking.quantity}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(booking.start_time), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}{" "}
                            até{" "}
                            {format(new Date(booking.end_time), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(booking.total_price)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Produtos */}
          {order.order_items && order.order_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Produtos ({order.order_items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{item.product.name}</h4>
                          <div className="text-sm text-muted-foreground">
                            Quantidade: {item.quantity}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Preço unitário: {formatCurrency(item.price_per_unit)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(item.quantity * item.price_per_unit)}
                          </div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>
           )}

          {/* Upload de Nota Fiscal */}
          <Card>
            <CardHeader>
              <CardTitle>Nota Fiscal</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceUpload
                recordId={order.id}
                recordType="order"
                currentInvoiceUrl={order.invoice_url}
              />
            </CardContent>
          </Card>
         </div>
       </DialogContent>
     </Dialog>
   );
 };