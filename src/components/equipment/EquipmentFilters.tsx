
import React from "react";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TimeSelector } from "@/components/rooms/TimeSelector";

interface FiltersProps {
  filters: {
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
  };
  setFilters: React.Dispatch<
    React.SetStateAction<{
      date: Date | null;
      startTime: string | null;
      endTime: string | null;
    }>
  >;
  onFilter: () => void;
  onClear: () => void;
}

export const EquipmentFilters: React.FC<FiltersProps> = ({
  filters,
  setFilters,
  onFilter,
  onClear,
}) => {
  const handleDateSelect = (date: Date | undefined) => {
    setFilters((prev) => ({
      ...prev,
      date: date || null,
    }));
  };

  const handleStartTimeChange = (time: string) => {
    setFilters((prev) => ({
      ...prev,
      startTime: time,
    }));
  };

  const handleEndTimeChange = (time: string) => {
    setFilters((prev) => ({
      ...prev,
      endTime: time,
    }));
  };

  const isFilterActive =
    !!filters.date && !!filters.startTime && !!filters.endTime;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <h2 className="text-lg font-semibold mb-4">Filtrar por disponibilidade</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Data</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.date ? (
                  format(filters.date, "PPP", { locale: ptBR })
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.date || undefined}
                onSelect={handleDateSelect}
                initialFocus
                disabled={(date) => date < new Date()}
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Horário de início
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.startTime && "text-muted-foreground"
                )}
                disabled={!filters.date}
              >
                <Clock className="mr-2 h-4 w-4" />
                {filters.startTime ? (
                  filters.startTime
                ) : (
                  <span>Selecione o horário</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <TimeSelector
                onSelectTime={handleStartTimeChange}
                className="p-3"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Horário de término
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.endTime && "text-muted-foreground"
                )}
                disabled={!filters.startTime}
              >
                <Clock className="mr-2 h-4 w-4" />
                {filters.endTime ? (
                  filters.endTime
                ) : (
                  <span>Selecione o horário</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <TimeSelector
                onSelectTime={handleEndTimeChange}
                startTime={filters.startTime}
                className="p-3"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-end gap-2">
          <Button
            onClick={onFilter}
            className="flex-1"
            disabled={!isFilterActive}
          >
            Filtrar
          </Button>
          <Button
            variant="outline"
            onClick={onClear}
            className="flex-1"
            disabled={!isFilterActive}
          >
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
};
