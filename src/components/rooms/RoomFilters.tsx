
import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CityFilter } from "@/components/shared/CityFilter";

interface RoomFiltersProps {
  filters: {
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
    city: string | null;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
    city: string | null;
  }>>;
  onFilter: () => void;
  onClear: () => void;
}

// Opções de horários disponíveis para reserva de salas (8:00 às 18:00)
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
            <h2 className="text-xl font-semibold mb-4 text-roomly-700">Filtrar por Data & Hora</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            {/* Filtro de Cidade - agora usando CityFilter que busca das filiais */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
              <CityFilter
                selectedCity={filters.city || "all"}
                onCityChange={(value) => setFilters({ ...filters, city: value === "all" ? null : value })}
                placeholder="Selecione a cidade"
              />
            </div>

            {/* Seletor de Data */}
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
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Seletor de Horário de Início */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horário Inicial</label>
              <Select
                value={filters.startTime || ""}
                onValueChange={(value) => setFilters({ ...filters, startTime: value || null })}
              >
                <SelectTrigger className="w-full border-gray-300">
                  <SelectValue placeholder="Horário inicial">
                    {filters.startTime ? (
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        {filters.startTime}
                      </div>
                    ) : (
                      <span>Horário inicial</span>
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

            {/* Seletor de Horário de Término */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horário Final</label>
              <Select
                value={filters.endTime || ""}
                onValueChange={(value) => setFilters({ ...filters, endTime: value || null })}
              >
                <SelectTrigger className="w-full border-gray-300">
                  <SelectValue placeholder="Horário final">
                    {filters.endTime ? (
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        {filters.endTime}
                      </div>
                    ) : (
                      <span>Horário final</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* Filtrar horários que são posteriores ao horário de início */}
                  {timeOptions.filter(time => !filters.startTime || time > filters.startTime).map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botão de Busca */}
            <div className="flex items-end h-full">
              <Button
                onClick={onFilter}
                className="w-full px-6 bg-[#23406e] hover:bg-[#1a2e4d] text-white text-base font-semibold rounded-md shadow"
                disabled={!filters.date || !filters.startTime || !filters.endTime}
              >
                Buscar Salas
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
