
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  available: number;
  price_per_hour: number;
}

interface EquipmentCardProps {
  equipment: Equipment;
  selectedQuantity: number;
  onQuantityChange: (equipmentId: string, quantity: number) => void;
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  selectedQuantity,
  onQuantityChange,
}) => {
  const isAvailable = equipment.available > 0;

  return (
    <Card
      className={`p-4 transition-all duration-200 ${
        !isAvailable ? 'opacity-60 bg-muted' : 'hover:border-primary'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium text-lg">{equipment.name}</h4>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(equipment.price_per_hour)}/hora
          </p>
          {equipment.description && (
            <p className="text-sm text-muted-foreground mt-1">{equipment.description}</p>
          )}
        </div>
        {isAvailable ? (
          <Check className="text-green-500 h-5 w-5" />
        ) : (
          <X className="text-red-500 h-5 w-5" />
        )}
      </div>
      
      <div className="flex justify-between items-center">
        <p className={`text-sm font-medium ${!isAvailable ? 'text-red-500' : 'text-green-600'}`}>
          {isAvailable 
            ? `${equipment.available} disponível${equipment.available > 1 ? 's' : ''}` 
            : "Indisponível"}
        </p>
        
        {isAvailable && (
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuantityChange(
                equipment.id,
                Math.max(0, selectedQuantity - 1)
              )}
              disabled={!selectedQuantity}
              className="h-8 w-8"
            >
              -
            </Button>
            <span className="w-8 text-center font-medium">
              {selectedQuantity || 0}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuantityChange(
                equipment.id,
                Math.min(equipment.available, selectedQuantity + 1)
              )}
              disabled={selectedQuantity >= equipment.available}
              className="h-8 w-8"
            >
              +
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
