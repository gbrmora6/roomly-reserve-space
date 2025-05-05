
import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatCurrency";

interface EquipmentItem {
  quantity: number;
  equipment: {
    name: string;
    price_per_hour: number;
  };
}

interface BookingAdditionalEquipmentProps {
  equipmentItems: EquipmentItem[];
}

export const BookingAdditionalEquipment: React.FC<BookingAdditionalEquipmentProps> = ({
  equipmentItems,
}) => {
  if (!equipmentItems || equipmentItems.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Equipamentos Adicionais</h3>
      <div className="space-y-2">
        {equipmentItems.map((item, index) => (
          <div key={index} className="flex justify-between items-center p-2 bg-muted rounded-md">
            <div>
              <p className="font-medium">{item.equipment.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(item.equipment.price_per_hour)}/hora
              </p>
            </div>
            <Badge variant="outline">{item.quantity}x</Badge>
          </div>
        ))}
      </div>
    </div>
  );
};
