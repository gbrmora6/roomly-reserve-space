import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";
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

interface RefundButtonProps {
  orderId: string;
  paymentMethod?: string;
  status: string;
  onRefundSuccess?: () => void;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
  className?: string;
}

export const RefundButton: React.FC<RefundButtonProps> = ({
  orderId,
  paymentMethod,
  status,
  onRefundSuccess,
  size = "sm",
  variant = "outline",
  className = ""
}) => {
  const [isRefunding, setIsRefunding] = useState(false);
  const [reason, setReason] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Verificar se o estorno é possível
  const canRefund = () => {
    // Só permite estorno para pagamentos confirmados
    if (status !== "paid") {
      return false;
    }
    
    // Só permite estorno para PIX e cartão de crédito
    if (!paymentMethod || !["pix", "cartao", "card"].includes(paymentMethod.toLowerCase())) {
      return false;
    }
    
    return true;
  };

  const handleRefund = async () => {
    if (!canRefund()) {
      toast({
        title: "Estorno não disponível",
        description: "Este pagamento não pode ser estornado automaticamente.",
        variant: "destructive",
      });
      return;
    }

    setIsRefunding(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('payment-refund', {
        body: { 
          orderId,
          reason: reason.trim() || "Estorno solicitado pelo administrador"
        }
      });
      
      if (error) {
        throw new Error(error.message || "Erro ao processar estorno");
      }
      
      if (data.success) {
        toast({
          title: "Estorno processado",
          description: data.message || "O estorno foi processado com sucesso.",
        });
        
        if (onRefundSuccess) {
          onRefundSuccess();
        }
      } else {
        throw new Error(data.message || "Falha no processamento do estorno");
      }
    } catch (error: any) {
      console.error("Erro no estorno:", error);
      toast({
        title: "Erro no estorno",
        description: error.message || "Ocorreu um erro ao processar o estorno.",
        variant: "destructive",
      });
    } finally {
      setIsRefunding(false);
      setIsDialogOpen(false);
      setReason("");
    }
  };

  if (!canRefund()) {
    return null;
  }

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`text-red-600 hover:text-red-700 ${className}`}
          disabled={isRefunding}
        >
          {isRefunding ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RotateCcw className="h-3 w-3 mr-1" />
          )}
          {isRefunding ? "Processando..." : "Estornar"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Estorno</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja estornar este pagamento? Esta ação não pode ser desfeita.
            <br /><br />
            <strong>Método de pagamento:</strong> {paymentMethod?.toUpperCase()}
            <br />
            <strong>ID do pedido:</strong> {orderId}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2">
          <Label htmlFor="refund-reason">Motivo do estorno (opcional)</Label>
          <Textarea
            id="refund-reason"
            placeholder="Digite o motivo do estorno..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRefunding}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRefund}
            disabled={isRefunding}
            className="bg-red-600 hover:bg-red-700"
          >
            {isRefunding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar Estorno"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};