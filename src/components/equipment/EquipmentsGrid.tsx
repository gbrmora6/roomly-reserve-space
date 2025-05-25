import React from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatCurrency";
import EquipmentCard from "./EquipmentCard";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  available: number;
  price_per_hour: number;
  is_active: boolean;
}

interface EquipmentsGridProps {
  equipments: Equipment[] | undefined;
  address: string;
  showFilterMessage?: boolean;
}

export const EquipmentsGrid: React.FC<EquipmentsGridProps> = ({
  equipments,
  address,
  showFilterMessage = false,
}) => {
  if (showFilterMessage) {
    return (
      <div className="text-center py-10 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-medium">Selecione uma data e horário completos</h3>
        <p className="text-muted-foreground mt-1">
          Para ver os equipamentos disponíveis, escolha uma data e horários de início e término
        </p>
      </div>
    );
  }

  if (!equipments || equipments.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-medium">Nenhum equipamento disponível</h3>
        <p className="text-muted-foreground mt-1">
          Não há equipamentos disponíveis para o período selecionado
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {equipments.map((equipment) => (
        <EquipmentCard key={equipment.id} equipment={equipment} />
      ))}
    </div>
  );
};
