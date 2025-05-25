
import React from "react";
import EquipmentCard from "./EquipmentCard";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  available: number;
  price_per_hour: number;
  is_active: boolean;
  open_time?: string | null;
  close_time?: string | null;
}

interface EquipmentListProps {
  equipments: Equipment[];
  selectedEquipment: Record<string, number>;
  onEquipmentChange: (equipmentId: string, quantity: number) => void;
}

export const EquipmentList: React.FC<EquipmentListProps> = ({
  equipments,
  selectedEquipment,
  onEquipmentChange,
}) => {
  if (equipments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Nenhum equipamento disponível para este horário.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {equipments.map((equipment) => (
        <EquipmentCard
          key={equipment.id}
          equipment={equipment}
          selectedQuantity={selectedEquipment[equipment.id] || 0}
          onQuantityChange={onEquipmentChange}
        />
      ))}
    </div>
  );
};
