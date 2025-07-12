import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

interface RefundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onConfirm: (reason?: string) => void;
}

export function RefundModal({ open, onOpenChange, order, onConfirm }: RefundModalProps) {
  const [reason, setReason] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(reason);
    } finally {
      setIsConfirming(false);
      setReason("");
    }
  };

  const getRefundInfo = () => {
    switch (order.payment_method) {
      case 'pix':
        if (order.status === 'in_process') {
          return {
            message: "O PIX será cancelado automaticamente pois ainda não foi pago.",
            warning: "Esta ação não pode ser desfeita."
          };
        } else {
          return {
            message: "O estorno será processado automaticamente e o valor retornará em até 1 hora útil.",
            warning: "Esta ação não pode ser desfeita."
          };
        }
      case 'boleto':
        if (order.status === 'in_process') {
          return {
            message: "O boleto será cancelado automaticamente pois ainda não foi pago.",
            warning: "Esta ação não pode ser desfeita."
          };
        } else {
          return {
            message: "Boletos pagos não podem ser estornados automaticamente. Nossa equipe entrará em contato.",
            warning: "O prazo para análise é de até 5 dias úteis."
          };
        }
      case 'cartao':
        return {
          message: "O estorno será processado na operadora do cartão. O prazo varia de 1 a 7 dias úteis.",
          warning: "Esta ação não pode ser desfeita."
        };
      default:
        return {
          message: "O estorno será analisado pela nossa equipe.",
          warning: "Esta ação não pode ser desfeita."
        };
    }
  };

  const refundInfo = getRefundInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Solicitar Estorno
          </DialogTitle>
          <DialogDescription>
            Você está solicitando o estorno do pedido #{order.id.slice(-8).toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Informações do Estorno:</h4>
            <p className="text-sm text-blue-700 mb-2">{refundInfo.message}</p>
            <p className="text-xs text-blue-600">{refundInfo.warning}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Valor:</span>
              <p className="font-medium">{formatCurrency(order.total_amount)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Método:</span>
              <p className="font-medium capitalize">{order.payment_method}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do estorno (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo do estorno..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? "Processando..." : "Confirmar Estorno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}