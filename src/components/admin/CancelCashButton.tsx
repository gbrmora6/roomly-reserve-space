import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CancelCashButtonProps {
  orderId: string;
  paymentMethod?: string;
  status: string;
  onCancelSuccess?: () => void;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
  className?: string;
}

export const CancelCashButton: React.FC<CancelCashButtonProps> = ({
  orderId,
  paymentMethod,
  status,
  onCancelSuccess,
  size = "sm",
  variant = "outline",
  className = ""
}) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Verificar se o cancelamento é possível
  const canCancel = () => {
    // Só permite cancelamento para pagamentos em dinheiro e pagos
    if (status !== "paid") {
      return false;
    }
    
    // Só permite cancelamento para pagamentos em dinheiro
    if (!paymentMethod || paymentMethod.toLowerCase() !== "dinheiro") {
      return false;
    }
    
    return true;
  };

  const handleCancel = async () => {
    if (!canCancel()) {
      toast({
        title: "Cancelamento não disponível",
        description: "Este pedido não pode ser cancelado.",
        variant: "destructive",
      });
      return;
    }

    setIsCancelling(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('cancel-cash-order', {
        body: { 
          orderId,
          reason: reason.trim() || "Cancelado pelo administrador"
        }
      });
      
      if (error) {
        throw new Error(error.message || "Erro ao processar cancelamento");
      }
      
      if (data.success) {
        toast({
          title: "Pedido cancelado",
          description: data.message || "O pedido em dinheiro foi cancelado com sucesso.",
        });
        
        if (onCancelSuccess) {
          onCancelSuccess();
        }
      } else {
        throw new Error(data.message || "Falha no cancelamento do pedido");
      }
    } catch (error: any) {
      console.error("Erro no cancelamento:", error);
      toast({
        title: "Erro no cancelamento",
        description: error.message || "Ocorreu um erro ao cancelar o pedido.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setIsDialogOpen(false);
      setReason("");
    }
  };

  if (!canCancel()) {
    return null;
  }

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`text-red-600 hover:text-red-700 ${className}`}
          disabled={isCancelling}
        >
          {isCancelling ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <X className="h-3 w-3 mr-1" />
          )}
          {isCancelling ? "Cancelando..." : "Cancelar"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja cancelar este pedido em dinheiro? Esta ação irá:
            <br />• Cancelar o pedido e marcar como "cancelado"
            <br />• Cancelar todas as reservas de salas e equipamentos
            <br />• Restaurar o estoque dos produtos
            <br /><br />
            <strong>Método de pagamento:</strong> {paymentMethod?.toUpperCase()}
            <br />
            <strong>ID do pedido:</strong> {orderId}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Motivo do cancelamento (opcional)</Label>
          <Textarea
            id="cancel-reason"
            placeholder="Digite o motivo do cancelamento..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isCancelling}
            className="bg-red-600 hover:bg-red-700"
          >
            {isCancelling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelando...
              </>
            ) : (
              "Confirmar Cancelamento"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};