
import { useState } from "react";

interface UseEquipmentQuantityProps {
  initialQuantity?: number;
  maxQuantity: number;
}

export function useEquipmentQuantity({
  initialQuantity = 1,
  maxQuantity
}: UseEquipmentQuantityProps) {
  const [quantity, setQuantity] = useState<number>(initialQuantity);

  const updateQuantity = (newQuantity: number) => {
    // Ensure quantity is within valid range
    const validQuantity = Math.max(1, Math.min(maxQuantity, newQuantity));
    setQuantity(validQuantity);
  };

  return {
    quantity,
    setQuantity: updateQuantity
  };
}
