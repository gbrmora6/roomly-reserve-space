
import React from "react";
import { formatCurrency } from "@/utils/formatCurrency";

interface EquipmentBookingSummaryProps {
  bookingTotal: number;
}

export const EquipmentBookingSummary: React.FC<EquipmentBookingSummaryProps> = ({
  bookingTotal,
}) => {
  if (bookingTotal <= 0) return null;
  
  return (
    <div className="bg-card rounded-lg p-4 shadow-sm text-center">
      <h3 className="text-lg font-medium mb-2">Resumo da reserva</h3>
      <p className="text-sm text-gray-500">Valor total da reserva</p>
      <p className="text-xl font-bold text-primary">
        {formatCurrency(bookingTotal)}
      </p>
    </div>
  );
};
