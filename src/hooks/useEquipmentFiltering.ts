
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
export const useEquipmentFiltering = () => {
  const [filters, setFilters] = useState<EquipmentFilters>({
    date: null,
    startTime: null,
    endTime: null,
    city: null,
  });

  const query = useQuery({
    queryKey: ["equipment-filtered", filters],
    queryFn: async (): Promise<EquipmentWithAvailability[]> => {
      console.log("Filtrando equipamentos com:", filters);

      // Query base para equipamentos ativos
      let equipmentQuery = supabase
        .from('equipment')
        .select('*')
        .eq('is_active', true);

      // Aplicar filtro de cidade se selecionado
      if (filters.city) {
        console.log("Aplicando filtro de cidade:", filters.city);
        
        // Buscar IDs das filiais da cidade selecionada
        const { data: branches, error: branchError } = await supabase
          .from('branches')
          .select('id')
          .eq('city', filters.city);
        
        if (branchError) {
          console.error("Erro ao buscar filiais:", branchError);
          throw branchError;
        }
        
        const branchIds = branches.map(branch => branch.id);
        console.log("IDs das filiais da cidade:", branchIds);
        
        if (branchIds.length > 0) {
          equipmentQuery = equipmentQuery.in('branch_id', branchIds);
        } else {
          // Se não há filiais na cidade, retornar array vazio
          return [];
        }
      }

      const { data: allEquipment, error: equipmentError } = await equipmentQuery;

      if (equipmentError) {
        console.error("Erro ao buscar equipamentos:", equipmentError);
        throw equipmentError;
      }

      // Se não há filtros de data/horário, retornar todos os equipamentos
      if (!filters.date || !filters.startTime || !filters.endTime) {
        return (allEquipment || []).map(equipment => ({
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
      
      for (const equipment of allEquipment || []) {
        // Buscar disponibilidade do equipamento para a data selecionada
        const { data: availability, error: availabilityError } = await supabase
          .rpc('get_equipment_availability', {
            p_equipment_id: equipment.id,
            p_date: dateStr,
            p_requested_quantity: 1 // Por enquanto, verificar se há pelo menos 1 unidade disponível
          });

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
      city: null,
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
