
import React from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatCurrency";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  available: number;
  price_per_hour: number;
}

interface EquipmentsGridProps {
  equipments: Equipment[] | undefined;
  onReserve: (equipment: Equipment) => void;
  isLoggedIn: boolean;
  address: string;
  showFilterMessage?: boolean;
}

export const EquipmentsGrid: React.FC<EquipmentsGridProps> = ({
  equipments,
  onReserve,
  isLoggedIn,
  address,
  showFilterMessage = false,
}) => {
  if (showFilterMessage) {
    return (
      <div className="text-center py-10 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-medium">Selecione uma data e horário</h3>
        <p className="text-muted-foreground mt-1">
          Para ver os equipamentos disponíveis, escolha uma data e um horário
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
        <div
          key={equipment.id}
          className="rounded-lg border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-2">{equipment.name}</h3>
            
            {equipment.description && (
              <p className="text-gray-600 mb-4">{equipment.description}</p>
            )}
            
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">Disponíveis:</span> {equipment.available} de {equipment.quantity}
              </p>
              <p className="text-base font-medium">
                {formatCurrency(equipment.price_per_hour)} / hora
              </p>
              {address && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Local:</span> {address}
                </p>
              )}
            </div>
            
            {isLoggedIn ? (
              <Button className="w-full" onClick={() => onReserve(equipment)}>
                Reservar
              </Button>
            ) : (
              <Button className="w-full" disabled>
                Faça login para reservar
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
