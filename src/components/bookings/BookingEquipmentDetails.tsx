
import React from "react";
import { formatCurrency } from "@/utils/formatCurrency";

interface EquipmentDetails {
  name: string;
  price_per_hour: number;
}

interface BookingEquipmentDetailsProps {
  equipment: EquipmentDetails;
  quantity: number;
}

export const BookingEquipmentDetails: React.FC<BookingEquipmentDetailsProps> = ({
  equipment,
  quantity,
}) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Equipamento Reservado</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Nome do Equipamento</p>
          <p className="font-medium">{equipment.name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Quantidade</p>
          <p className="font-medium">{quantity}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Preço por hora</p>
          <p className="font-medium">{formatCurrency(equipment.price_per_hour)}</p>
        </div>
      </div>
    </div>
  );
};
