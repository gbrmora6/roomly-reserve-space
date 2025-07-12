import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  FileText, 
  QrCode, 
  Clock, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Banknote
} from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BoletoActions } from "./BoletoActions";
import { PixActions } from "./PixActions";
import { RefundModal } from "./RefundModal";

interface PaymentCardProps {
  order: any;
  onRefresh: (orderId: string) => void;
  onRefund: (orderId: string, reason?: string) => void;
  isRefreshing?: boolean;
}

export function PaymentCard({ order, onRefresh, onRefund, isRefreshing }: PaymentCardProps) {
  const [showRefundModal, setShowRefundModal] = useState(false);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          color: 'bg-green-500',
          icon: CheckCircle2,
          label: 'Pago',
          variant: 'default' as const
        };
      case 'in_process':
        return {
          color: 'bg-yellow-500',
          icon: Clock,
          label: 'Aguardando Pagamento',
          variant: 'secondary' as const
        };
      case 'cancelled':
        return {
          color: 'bg-red-500',
          icon: XCircle,
          label: 'Cancelado',
          variant: 'destructive' as const
        };
      case 'pending':
        return {
          color: 'bg-blue-500',
          icon: Clock,
          label: 'Pendente',
          variant: 'outline' as const
        };
      default:
        return {
          color: 'bg-gray-500',
          icon: AlertCircle,
          label: status,
          variant: 'outline' as const
        };
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'pix':
        return QrCode;
      case 'boleto':
        return FileText;
      case 'cartao':
      case 'card':
        return CreditCard;
      default:
        return Banknote;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'pix':
        return 'PIX';
      case 'boleto':
        return 'Boleto';
      case 'cartao':
      case 'card':
        return 'Cartão de Crédito';
      default:
        return method;
    }
  };

  const statusConfig = getStatusConfig(order.status);
  const PaymentMethodIcon = getPaymentMethodIcon(order.payment_method);
  const StatusIcon = statusConfig.icon;

  const isExpired = order.expires_at && new Date(order.expires_at) < new Date();
  const canRefund = order.status === 'paid' && (order.payment_method === 'pix' || order.payment_method === 'cartao');
  const isRefunding = order.refund_status === 'processing';

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PaymentMethodIcon className="h-5 w-5" />
            {getPaymentMethodLabel(order.payment_method)}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig.variant} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            {order.refund_status && (
              <Badge variant="outline">
                Estorno: {order.refund_status}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informações básicas */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Pedido:</span>
            <p className="font-medium">#{order.id.slice(-8).toUpperCase()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Valor:</span>
            <p className="font-medium">{formatCurrency(order.total_amount)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Data:</span>
            <p className="font-medium">
              {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          {order.expires_at && (
            <div>
              <span className="text-muted-foreground">Expira em:</span>
              <p className={`font-medium ${isExpired ? 'text-red-500' : ''}`}>
                {format(new Date(order.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          )}
        </div>

        {/* Alerta de expiração */}
        {isExpired && order.status === 'in_process' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">Este pagamento expirou</span>
          </div>
        )}

        {/* Ações específicas por método de pagamento */}
        {order.payment_details?.[0] && (
          <div className="border-t pt-4">
            {order.payment_method === 'boleto' && (
              <BoletoActions 
                paymentDetails={order.payment_details[0]}
                isExpired={isExpired}
              />
            )}
            {order.payment_method === 'pix' && (
              <PixActions 
                paymentDetails={order.payment_details[0]}
                isExpired={isExpired}
              />
            )}
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRefresh(order.id)}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>

          {canRefund && !isRefunding && order.refund_status !== 'completed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRefundModal(true)}
              className="flex items-center gap-1 text-red-600 hover:text-red-700"
            >
              <XCircle className="h-4 w-4" />
              Solicitar Estorno
            </Button>
          )}
        </div>

        {/* Items do pedido */}
        {order.order_items && order.order_items.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-2">Itens do Pedido:</h4>
            <div className="space-y-1">
              {order.order_items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.product?.name || 'Produto'}
                  </span>
                  <span>{formatCurrency(item.price_per_unit * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <RefundModal
        open={showRefundModal}
        onOpenChange={setShowRefundModal}
        order={order}
        onConfirm={(reason) => {
          onRefund(order.id, reason);
          setShowRefundModal(false);
        }}
      />
    </Card>
  );
}