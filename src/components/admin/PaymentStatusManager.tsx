import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, RotateCcw, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { RefundModal } from "@/components/orders/RefundModal";

interface PaymentStatusManagerProps {
  orderId: string;
  status: string;
  paymentMethod?: string;
  onStatusUpdate: () => void;
  order?: any;
}

export const PaymentStatusManager: React.FC<PaymentStatusManagerProps> = ({
  orderId,
  status,
  paymentMethod,
  onStatusUpdate,
  order
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const handleCheckStatus = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('payment-status', {
        body: { orderId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Status atualizado",
        description: data.message || "Status do pagamento foi consultado",
      });
      
      onStatusUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao consultar status",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCapture = async () => {
    setIsCapturing(true);
    try {
      const { data, error } = await supabase.functions.invoke('capture-payment', {
        body: { orderId }
      });
      
      if (error) throw error;
      
      toast({
        title: data.success ? "Pagamento capturado" : "Erro na captura",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      
      if (data.success) {
        onStatusUpdate();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao capturar pagamento",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRefund = async (reason?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('payment-refund', {
        body: { orderId, reason }
      });
      
      if (error) throw error;
      
      toast({
        title: data.success ? "Estorno solicitado" : "Erro no estorno",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      
      if (data.success) {
        onStatusUpdate();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao solicitar estorno",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
    setShowRefundModal(false);
  };

  const canRefund = status === "paid" && paymentMethod && ["pix", "cartao"].includes(paymentMethod);
  const canCapture = status === "authorized" && paymentMethod === "cartao";

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCheckStatus}
        disabled={isRefreshing}
        className="h-8"
      >
        <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? "Consultando..." : "Consultar Status"}
      </Button>
      
      {canCapture && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCapture}
          disabled={isCapturing}
          className="h-8 text-green-600 hover:text-green-700"
        >
          <CreditCard className={`h-3 w-3 mr-1 ${isCapturing ? 'animate-pulse' : ''}`} />
          {isCapturing ? "Capturando..." : "Capturar"}
        </Button>
      )}
      
      {canRefund && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRefundModal(true)}
          className="h-8 text-red-600 hover:text-red-700"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Estornar
        </Button>
      )}

      <RefundModal
        open={showRefundModal}
        onOpenChange={setShowRefundModal}
        order={order}
        onConfirm={handleRefund}
      />
    </div>
  );
};