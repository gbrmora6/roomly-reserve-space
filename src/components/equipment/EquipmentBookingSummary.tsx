
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export function EquipmentBookingSummary({
  equipment,
  quantity,
  startTime,
  endTime,
  totalPrice,
  onConfirm,
  loading,
  onCancel,
}: {
  equipment: any;
  quantity: number;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  onConfirm: () => void;
  loading: boolean;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCheckout = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "É necessário estar logado",
        description: "Faça login para continuar com a reserva.",
      });
      return;
    }

    // Simply confirm the equipment booking
    onConfirm();
  };

  const formatDate = (date: Date) => date.toLocaleString("pt-BR");

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="text-lg font-semibold">Resumo da Reserva</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Equipamento:</span>
              <span>{equipment?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantidade:</span>
              <span>{quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data e hora inicial:</span>
              <span>{formatDate(startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data e hora final:</span>
              <span>{formatDate(endTime)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total da reserva:</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <CardFooter className="flex justify-between px-0">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleCheckout}
          disabled={loading}
          className="bg-roomly-600 hover:bg-roomly-700"
        >
          {loading ? "Processando..." : "Confirmar Reserva"}
        </Button>
      </CardFooter>
    </div>
  );
}
