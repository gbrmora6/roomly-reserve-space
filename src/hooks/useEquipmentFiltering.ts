
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

      // Construir datas de início e fim para verificar disponibilidade
      const startDate = new Date(filters.date);
      const [startHours, startMinutes] = filters.startTime.split(':');
      startDate.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

      const endDate = new Date(filters.date);
      const [endHours, endMinutes] = filters.endTime.split(':');
      endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      console.log("Verificando disponibilidade para:", {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });

      // Buscar reservas de equipamentos que conflitam com o horário
      const { data: bookings, error: bookingsError } = await supabase
        .from('booking_equipment')
        .select('equipment_id, quantity')
        .not('status', 'eq', 'cancelled')
        .lte('start_time', endDate.toISOString())
        .gte('end_time', startDate.toISOString());

      if (bookingsError) {
        console.error("Erro ao buscar reservas de equipamentos:", bookingsError);
        throw bookingsError;
      }

      // Calcular quantidades reservadas por equipamento
      const reservedQuantities: Record<string, number> = {};
      bookings?.forEach(booking => {
        reservedQuantities[booking.equipment_id] = 
          (reservedQuantities[booking.equipment_id] || 0) + booking.quantity;
      });

      // Filtrar equipamentos com quantidade disponível
      const availableEquipment = (allEquipment || []).map(equipment => ({
        ...equipment,
        available: equipment.quantity - (reservedQuantities[equipment.id] || 0)
      })).filter(equipment => equipment.available > 0);

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
