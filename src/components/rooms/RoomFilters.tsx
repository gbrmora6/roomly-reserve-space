
import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RoomFiltersProps {
  filters: {
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
  }>>;
  onFilter: () => void;
  onClear: () => void;
}

const timeOptions = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

export const RoomFilters: React.FC<RoomFiltersProps> = ({ 
  filters, 
  setFilters, 
  onFilter,
  onClear 
}) => {
  return (
    <Card className="mb-8 bg-white shadow-lg border-roomly-100">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-roomly-700">Filtrar por Data e Horário</h2>
            <p className="text-gray-600 mb-6 text-lg">
              Selecione a data e horário desejados para verificar a disponibilidade das salas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Date picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal border-gray-300"
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
                    onSelect={(date) => setFilters({ ...filters, date })}
                    className="pointer-events-auto"
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Start Time picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horário Inicial</label>
              <Select
                value={filters.startTime || ""}
                onValueChange={(value) => setFilters({ ...filters, startTime: value || null })}
              >
                <SelectTrigger className="w-full border-gray-300">
                  <SelectValue placeholder="Selecione um horário">
                    {filters.startTime ? (
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        {filters.startTime}
                      </div>
                    ) : (
                      <span>Selecione um horário</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* End Time picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horário Final</label>
              <Select
                value={filters.endTime || ""}
                onValueChange={(value) => setFilters({ ...filters, endTime: value || null })}
              >
                <SelectTrigger className="w-full border-gray-300">
                  <SelectValue placeholder="Selecione um horário">
                    {filters.endTime ? (
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        {filters.endTime}
                      </div>
                    ) : (
                      <span>Selecione um horário</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.filter(time => !filters.startTime || time > filters.startTime).map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button
              variant="outline"
              onClick={onClear}
              className="px-6"
            >
              Limpar Filtros
            </Button>
            <Button
              onClick={onFilter}
              className="px-6"
              disabled={!filters.date || !filters.startTime || !filters.endTime}
            >
              Filtrar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
