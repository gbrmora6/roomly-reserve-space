
import React, { useState } from "react";
import EquipmentCard from "./EquipmentCard";
import { CityFilter } from "@/components/shared/CityFilter";

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
  branch?: { city: string; name: string };
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
  const [selectedCity, setSelectedCity] = useState("all");

  // Filter equipments by city
  const filteredEquipments = equipments.filter(equipment => {
    if (selectedCity === "all") return true;
    return equipment.branch?.city === selectedCity;
  });

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Equipamentos Disponíveis</h3>
        <CityFilter
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          placeholder="Filtrar por cidade"
        />
      </div>
      
      {filteredEquipments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Nenhum equipamento disponível nesta cidade para este horário.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEquipments.map((equipment) => (
            <EquipmentCard
              key={equipment.id}
              equipment={equipment}
              selectedQuantity={selectedEquipment[equipment.id] || 0}
              onQuantityChange={onEquipmentChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};
