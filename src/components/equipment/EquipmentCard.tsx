import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, Plus, Minus } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
  is_active: boolean;
  open_time?: string | null;
  close_time?: string | null;
  image_url?: string;
}

interface EquipmentCardProps {
  equipment: Equipment;
  selectedQuantity?: number;
  onQuantityChange?: (equipmentId: string, quantity: number) => void;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ 
  equipment, 
  selectedQuantity = 0, 
  onQuantityChange 
}) => {
  const handleQuantityChange = (change: number) => {
    if (onQuantityChange) {
      const newQuantity = Math.max(0, Math.min(equipment.quantity, selectedQuantity + change));
      onQuantityChange(equipment.id, newQuantity);
    }
  };

  // Supondo que futuramente terá uma imagem, usar um placeholder por enquanto
  const imageUrl = equipment.image_url || "https://placehold.co/400x300?text=Equipment";

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 flex flex-col h-full overflow-hidden">
      <img
        src={imageUrl}
        alt={equipment.name}
        className="w-full h-48 object-cover"
      />
      <div className="flex-1 flex flex-col p-5">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg text-gray-900">{equipment.name}</span>
          </div>
          <p className="text-gray-600 text-sm mb-2 line-clamp-2">{equipment.description || "Equipamento disponível para reserva"}</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl font-semibold text-gray-900">{formatCurrency(equipment.price_per_hour)}</span>
            <span className="text-sm text-gray-500">/ hour</span>
          </div>
          {/* Tags/características */}
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="bg-gray-100 rounded px-2 py-1 text-xs text-gray-700">{equipment.quantity} unidades</span>
            {equipment.open_time && equipment.close_time && (
              <span className="bg-gray-100 rounded px-2 py-1 text-xs text-gray-700">
                {equipment.open_time} às {equipment.close_time}
              </span>
            )}
          </div>
        </div>
        {!onQuantityChange && (
          <div className="flex justify-end mt-2">
            <Button asChild className="bg-[#23406e] hover:bg-[#1a2e4d] text-white font-semibold px-6 py-2 rounded-md">
              <Link to={`/equipment/${equipment.id}`}>View Details</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentCard;
