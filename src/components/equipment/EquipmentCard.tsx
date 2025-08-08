import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Minus } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { useCompanyAddress } from "@/hooks/useCompanyAddress";
import { ImageCarousel } from "@/components/shared/ImageCarousel";

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
  equipment_photos?: Array<{ url: string }>;
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
  const { formatAddress } = useCompanyAddress();
  
  const handleQuantityChange = (change: number) => {
    if (onQuantityChange) {
      const newQuantity = Math.max(0, Math.min(equipment.quantity, selectedQuantity + change));
      onQuantityChange(equipment.id, newQuantity);
    }
  };

  // Coletar todas as imagens disponíveis
  const equipmentImages = [];
  if (equipment.equipment_photos?.length) {
    equipmentImages.push(...equipment.equipment_photos.map(photo => photo.url));
  } else if (equipment.image_url) {
    equipmentImages.push(equipment.image_url);
  }

  console.log('EquipmentCard - Equipment:', equipment.name, 'Images count:', equipmentImages.length, 'Images:', equipmentImages);

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow border border-gray-100 flex flex-col h-full overflow-hidden">
      <div className="h-32 sm:h-40 md:h-48 w-full">
        {equipmentImages.length > 0 ? (
          <ImageCarousel 
            images={equipmentImages}
            alt={equipment.name}
            className="h-32 sm:h-40 md:h-48"
          />
        ) : (
          <div className="w-full h-32 sm:h-40 md:h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-gray-400 text-center">
              <div className="text-2xl mb-2">⚙️</div>
              <div className="text-sm">Sem imagem</div>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col p-3 sm:p-4 md:p-5">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm sm:text-base md:text-lg text-gray-900 truncate">{equipment.name}</span>
          </div>
          <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">{equipment.description || "Equipamento disponível para reserva"}</p>
          <div className="flex items-center gap-1 sm:gap-2 mb-2">
            <span className="text-lg sm:text-xl font-semibold text-gray-900">{formatCurrency(equipment.price_per_hour)}</span>
            <span className="text-xs sm:text-sm text-gray-500">/ hora</span>
          </div>
          {formatAddress() && (
            <div className="flex items-center gap-1 mb-2">
              <MapPin className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">{formatAddress()}</span>
            </div>
          )}
        </div>
        {!onQuantityChange && (
          <div className="flex justify-end mt-2">
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm">
              <Link to={`/equipment/${equipment.id}`}>Reservar Equipamento</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentCard;
