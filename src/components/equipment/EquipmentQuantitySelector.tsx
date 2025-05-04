
import React from "react";
import { Button } from "@/components/ui/button";

interface EquipmentQuantitySelectorProps {
  quantity: number;
  setQuantity: (quantity: number) => void;
  maxQuantity: number;
}

export const EquipmentQuantitySelector: React.FC<EquipmentQuantitySelectorProps> = ({
  quantity,
  setQuantity,
  maxQuantity,
}) => {
  return (
    <div className="bg-card rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-medium mb-3">Quantidade</h3>
      <div className="flex items-center gap-2 justify-center">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          disabled={quantity <= 1}
        >
          -
        </Button>
        <span className="w-8 text-center font-medium">{quantity}</span>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
          disabled={quantity >= maxQuantity}
        >
          +
        </Button>
      </div>
    </div>
  );
};
