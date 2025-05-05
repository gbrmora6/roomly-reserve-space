
import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EquipmentDateSelectorProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date | undefined) => void;
  isDateDisabled: (date: Date) => boolean;
}

export const EquipmentDateSelector: React.FC<EquipmentDateSelectorProps> = ({
  selectedDate,
  onDateSelect,
  isDateDisabled,
}) => {
  return (
    <div className="bg-card rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-medium mb-3 text-center">Selecione uma data</h3>
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate!}
          onSelect={onDateSelect}
          className="rounded-md border mx-auto max-w-full"
          disabled={isDateDisabled}
          locale={ptBR}
        />
      </div>
    </div>
  );
};
