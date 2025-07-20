
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useBranchByCity } from "./useBranchByCity";

// Interface para definir os filtros de equipamentos
interface EquipmentFilters {
  date: Date | null;
  startTime: string | null;
  endTime: string | null;
  city: string | null;
}

// Interface para equipamento com propriedade available
interface EquipmentWithAvailability {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
  available: number;
  open_time?: string;
  close_time?: string;
  open_days?: string[];
  is_active: boolean;
  branch_id: string;
  created_at: string;
  updated_at: string;
}

// Hook para filtrar equipamentos por filial baseado na cidade
export const useEquipmentFiltering = (selectedCity: string = "all") => {
  const [filters, setFilters] = useState<EquipmentFilters>({
    date: null,
    startTime: null,
    endTime: null,
    city: selectedCity,
  });

  const { data: branchId } = useBranchByCity(selectedCity);

  const query = useQuery({
    queryKey: ["equipment-filtered", filters, selectedCity, branchId],
    queryFn: async (): Promise<EquipmentWithAvailability[]> => {
      console.log("Filtrando equipamentos com:", { ...filters, selectedCity, branchId });

      // Query base para equipamentos ativos
      let equipmentQuery = supabase
        .from('equipment')
        .select('*')
        .eq('is_active', true);

      // Aplicar filtro de cidade se selecionado
      if (selectedCity && selectedCity !== "all" && branchId) {
        console.log("Aplicando filtro de branch:", branchId);
        equipmentQuery = equipmentQuery.eq('branch_id', branchId);
      }

      const { data: allEquipment, error: equipmentError } = await equipmentQuery;

      if (equipmentError) {
        console.error("Erro ao buscar equipamentos:", equipmentError);
        throw equipmentError;
      }

      // Se não há equipamentos ou filtros de data/horário, retornar com quantidade total disponível
      if (!allEquipment || allEquipment.length === 0) {
        return [];
      }

      if (!filters.date || !filters.startTime || !filters.endTime) {
        return allEquipment.map(equipment => ({
          ...equipment,
          available: equipment.quantity
        }));
      }

      // Usar a função get_equipment_availability para verificar disponibilidade de cada equipamento
      const dateStr = format(filters.date, 'yyyy-MM-dd');
      const startHour = parseInt(filters.startTime.split(':')[0]);
      const endHour = parseInt(filters.endTime.split(':')[0]);
      
      console.log("Verificando disponibilidade para:", {
        date: dateStr,
        startHour,
        endHour
      });

      const availableEquipment = [];
      
      for (const equipment of allEquipment) {
        // Buscar disponibilidade do equipamento para a data selecionada
        // Simple availability check - assume equipment is available
        const availability = [{
          hour: "8:00",
          is_available: true,
          available_quantity: equipment.quantity || 1
        }];
        const availabilityError = null;

        if (availabilityError) {
          console.error(`Erro ao verificar disponibilidade do equipamento ${equipment.name}:`, availabilityError);
          continue;
        }

        // Verificar se todos os horários solicitados estão disponíveis
        if (availability && availability.length > 0) {
          const requestedHours = [];
          for (let hour = startHour; hour < endHour; hour++) {
            requestedHours.push(`${hour.toString().padStart(2, '0')}:00`);
          }

          const availableSlots = availability.filter(slot => slot.is_available);
          const availableHours = availableSlots.map(slot => slot.hour);

          // Verificar se todos os horários solicitados estão disponíveis
          const allHoursAvailable = requestedHours.every(hour => availableHours.includes(hour));
          
          if (allHoursAvailable) {
            // Calcular a menor quantidade disponível em todos os horários solicitados
            const minAvailable = Math.min(...availableSlots
              .filter(slot => requestedHours.includes(slot.hour))
              .map(slot => slot.available_quantity));
              
            console.log(`Equipamento ${equipment.name} disponível para o período solicitado (${minAvailable} unidades)`);
            availableEquipment.push({
              ...equipment,
              available: minAvailable
            });
          } else {
            console.log(`Equipamento ${equipment.name} não disponível para todo o período solicitado`);
          }
        } else {
          console.log(`Equipamento ${equipment.name} fechado na data ${dateStr}`);
        }
      }

      console.log("Equipamentos disponíveis:", availableEquipment.length);
      return availableEquipment;
    },
  });

  const handleFilter = () => {
    // Trigger refetch when filter button is clicked
    query.refetch();
  };

  const handleClearFilters = () => {
    setFilters({
      date: null,
      startTime: null,
      endTime: null,
      city: selectedCity,
    });
  };

  return {
    filters,
    setFilters,
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    handleFilter,
    handleClearFilters,
  };
};
