import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyAddress } from "@/hooks/useCompanyAddress";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { ListingGrid } from "@/components/shared/ListingGrid";
import { Database } from "@/integrations/supabase/types";
import { ReserveEquipmentModal } from "@/components/equipment/ReserveEquipmentModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  Wrench, 
  Clock, 
  Package,
  Search
} from "lucide-react";

// Use the correct enum type for open_days
interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
  available: number;
  open_time?: string;
  close_time?: string;
  open_days?: Database["public"]["Enums"]["weekday"][];
}

interface EquipmentWithAvailability extends Equipment {
  available: number;
}

const EquipmentList: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  
  // Estado dos filtros incluindo cidade
  const [filters, setFilters] = useState({
    date: null as Date | null,
    startTime: null as string | null,
    endTime: null as string | null,
    city: null as string | null,
  });
  
  const { formatAddress } = useCompanyAddress();

  // Query para buscar equipamentos com filtros aplicados - seguindo a mesma lógica das salas
  const { data: equipment, isLoading, error, refetch } = useQuery({
    queryKey: ["equipment", selectedCity, filters],
    queryFn: async () => {
      console.log("Buscando equipamentos com filtros:", { selectedCity, filters });

      // Se tem filtros de data e horário, buscar equipamentos disponíveis usando get_equipment_availability
      if (filters.date && filters.startTime && filters.endTime) {
        const dateStr = format(filters.date, 'yyyy-MM-dd');
        const startHour = parseInt(filters.startTime.split(':')[0]);
        const endHour = parseInt(filters.endTime.split(':')[0]);
        
        console.log("Filtrando equipamentos para data:", dateStr);
        console.log("Horário de início:", filters.startTime);
        console.log("Horário de término:", filters.endTime);

        try {
          // Buscar filiais baseado no filtro de cidade
          let branchQuery = supabase.from('branches').select('id');
          if (selectedCity !== "all") {
            branchQuery = branchQuery.eq('city', selectedCity);
          }
          
          const { data: branches, error: branchError } = await branchQuery;
          if (branchError) {
            console.error("Erro ao buscar filiais:", branchError);
            throw branchError;
          }
          
          const branchIds = branches.map(branch => branch.id);
          console.log("IDs das filiais filtradas:", branchIds);

          // Buscar todos os equipamentos ativos das filiais filtradas
          let equipmentQuery = supabase
            .from('equipment')
            .select(`
              *,
              equipment_photos (
                id,
                url
              )
            `)
            .eq('is_active', true);
          
          if (branchIds.length > 0) {
            equipmentQuery = equipmentQuery.in('branch_id', branchIds);
          }

          const { data: allEquipment, error: equipmentError } = await equipmentQuery;

          if (equipmentError) {
            console.error("Erro ao buscar equipamentos:", equipmentError);
            throw equipmentError;
          }

          // Verificar disponibilidade de cada equipamento usando a função get_equipment_availability
          const availableEquipment = [];
          
          for (const equip of allEquipment) {
            // Buscar disponibilidade do equipamento para a data selecionada
            const { data: availability, error: availabilityError } = await supabase
              .rpc('get_equipment_availability', {
                p_equipment_id: equip.id,
                p_date: dateStr,
                p_requested_quantity: 1
              });

            if (availabilityError) {
              console.error(`Erro ao verificar disponibilidade do equipamento ${equip.name}:`, availabilityError);
              continue;
            }

            // Verificar se há pelo menos alguns horários disponíveis no período solicitado
            if (availability && availability.length > 0) {
              const requestedHours = [];
              for (let hour = startHour; hour < endHour; hour++) {
                requestedHours.push(`${hour.toString().padStart(2, '0')}:00`);
              }

              const availableSlots = availability.filter(slot => slot.is_available);
              const availableHours = availableSlots.map(slot => slot.hour);

              // Verificar se há pelo menos um horário disponível no período solicitado
              const hasAvailableHours = requestedHours.some(hour => availableHours.includes(hour));
              
              if (hasAvailableHours) {
                console.log(`Equipamento ${equip.name} tem horários disponíveis no período solicitado`);
                availableEquipment.push({
                  ...equip,
                  available: Math.min(...availableSlots.map(slot => slot.available_quantity))
                });
              } else {
                console.log(`Equipamento ${equip.name} não tem horários disponíveis no período solicitado`);
              }
            } else {
              console.log(`Equipamento ${equip.name} fechado na data ${dateStr}`);
            }
          }

          console.log("Equipamentos disponíveis:", availableEquipment.length);
          return availableEquipment as EquipmentWithAvailability[];
        } catch (error) {
          console.error("Erro na consulta de filtro de equipamentos:", error);
          throw error;
        }
      }

      // Se há filtro de data (sem horário), verificar disponibilidade nos dias de funcionamento
      if (filters.date) {
        const dateStr = format(filters.date, 'yyyy-MM-dd');
        const dayOfWeek = filters.date.getDay(); // 0=domingo, 1=segunda, etc.
        
        console.log("Filtrando equipamentos para data:", dateStr, "Dia da semana:", dayOfWeek);

        try {
          // Buscar filiais baseado no filtro de cidade
          let branchQuery = supabase.from('branches').select('id');
          if (selectedCity !== "all") {
            branchQuery = branchQuery.eq('city', selectedCity);
          }
          
          const { data: branches, error: branchError } = await branchQuery;
          if (branchError) {
            console.error("Erro ao buscar filiais:", branchError);
            throw branchError;
          }
          
          const branchIds = branches.map(branch => branch.id);
          console.log("IDs das filiais filtradas:", branchIds);

          // Buscar todos os equipamentos ativos das filiais filtradas
          let equipmentQuery = supabase
            .from('equipment')
            .select(`
              *,
              equipment_photos (
                id,
                url
              ),
              equipment_schedules (
                weekday,
                start_time,
                end_time
              )
            `)
            .eq('is_active', true);
          
          if (branchIds.length > 0) {
            equipmentQuery = equipmentQuery.in('branch_id', branchIds);
          }

          const { data: allEquipment, error: equipmentError } = await equipmentQuery;

          if (equipmentError) {
            console.error("Erro ao buscar equipamentos:", equipmentError);
            throw equipmentError;
          }

          // Filtrar equipamentos que funcionam no dia da semana selecionado
          const availableEquipment = allEquipment.filter(equip => {
            // Verificar se o equipamento tem equipment_schedules para este dia
            if (equip.equipment_schedules && equip.equipment_schedules.length > 0) {
              const weekdayMap: Record<number, string> = {
                0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
                4: 'thursday', 5: 'friday', 6: 'saturday'
              };
              const weekdayName = weekdayMap[dayOfWeek];
              
              const hasScheduleForDay = equip.equipment_schedules.some(
                schedule => schedule.weekday === weekdayName
              );
              
              if (hasScheduleForDay) {
                console.log(`Equipamento ${equip.name} tem horário específico para ${weekdayName}`);
                return true;
              }
            }
            
            // Se não tem equipment_schedules, verificar open_days
            if (equip.open_days && equip.open_days.length > 0) {
              const weekdayMap: Record<number, string> = {
                0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
                4: 'thursday', 5: 'friday', 6: 'saturday'
              };
              const weekdayName = weekdayMap[dayOfWeek] as Database["public"]["Enums"]["weekday"];
              
              const isOpenOnDay = equip.open_days.includes(weekdayName);
              if (isOpenOnDay) {
                console.log(`Equipamento ${equip.name} funciona no dia ${dayOfWeek} (open_days)`);
                return true;
              }
            }
            
            console.log(`Equipamento ${equip.name} não funciona no dia selecionado`);
            return false;
          }).map(equip => ({ ...equip, available: equip.quantity }));

          console.log("Equipamentos disponíveis no dia selecionado:", availableEquipment.length);
          return availableEquipment as EquipmentWithAvailability[];
        } catch (error) {
          console.error("Erro na consulta de filtro por data:", error);
          throw error;
        }
      }

      // Buscar todos os equipamentos ativos (sem filtros específicos)
      let query = supabase
        .from("equipment")
        .select(`
          *,
          equipment_photos (
            id,
            url
          )
        `)
        .eq("is_active", true);

      // Aplicar filtro de cidade se selecionado
      if (selectedCity !== "all") {
        // Buscar IDs das filiais da cidade selecionada
        const { data: branches, error: branchError } = await supabase
          .from('branches')
          .select('id')
          .eq('city', selectedCity);
        
        if (branchError) {
          console.error("Erro ao buscar filiais:", branchError);
          throw branchError;
        }
        
        const branchIds = branches.map(branch => branch.id);
        if (branchIds.length > 0) {
          query = query.in('branch_id', branchIds);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data as any[]).map(equip => ({ ...equip, available: equip.quantity })) as EquipmentWithAvailability[];
    },
  });

  // Handler para aplicar filtros
  const handleFilter = () => {
    console.log("Aplicando filtros:", filters);
    refetch();
  };

  // Handler para limpar filtros
  const handleClearFilters = () => {
    setFilters({
      date: null,
      startTime: null,
      endTime: null,
      city: null,
    });
  };

  // Filtrar equipamentos por termo de busca
  const filteredEquipments = equipment?.filter(equipment =>
    equipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (equipment.description && equipment.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Converter equipamentos para o formato do ItemCard - removendo campo de quantidade
  const equipmentsForGrid = filteredEquipments?.map(equipment => ({
    id: equipment.id,
    title: equipment.name,
    description: equipment.description,
    price: equipment.price_per_hour,
    priceLabel: "por hora",
    image: undefined, // Equipments don't have photos in this structure
    status: equipment.available > 0 ? 'available' as const : 'unavailable' as const,
    location: formatAddress(),
    features: [
      { icon: Package, label: "Disponível", available: equipment.available > 0 },
    ],
    stats: [
      { icon: Clock, label: "Abertura", value: equipment.open_time || "N/A" },
      { icon: Clock, label: "Fechamento", value: equipment.close_time || "N/A" },
    ],
  })) || [];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Equipamentos Disponíveis"
          description="Encontre e reserve equipamentos para suas necessidades"
        />

        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={{ ...filters, city: selectedCity }}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            if (newFilters.city !== selectedCity) {
              setSelectedCity(newFilters.city || "all");
            }
          }}
          onFilter={handleFilter}
          onClear={handleClearFilters}
          showDateTimeFilters
          showLocationFilter
          placeholder="Buscar equipamentos..."
        />

        <ListingGrid
          items={equipmentsForGrid}
          isLoading={isLoading}
          error={error}
          onItemAction={(id) => {
            if (user) {
              const equipment = filteredEquipments?.find(e => e.id === id);
              if (equipment) {
                // Converter o tipo para o formato correto
                const equipmentForModal: Equipment = {
                  ...equipment,
                  open_days: equipment.open_days as Database["public"]["Enums"]["weekday"][]
                };
                setSelectedEquipment(equipmentForModal);
                setIsReserveModalOpen(true);
              }
            }
          }}
          actionLabel="Reservar Equipamento"
          emptyTitle="Nenhum equipamento encontrado"
          emptyDescription="Ajuste os filtros ou tente novamente mais tarde"
          emptyIcon={Search}
          variant="equipment"
          showFiltersMessage={!filters.date && !filters.startTime && !filters.endTime}
          filtersMessage="Selecione uma data e horário para verificar a disponibilidade dos equipamentos"
          resultCount={filteredEquipments?.length}
        />

        {/* Modal de reserva de equipamento */}
        <ReserveEquipmentModal
          isOpen={isReserveModalOpen}
          onOpenChange={setIsReserveModalOpen}
          selectedEquipment={selectedEquipment}
          filters={filters}
        />
      </div>
    </MainLayout>
  );
};

export default EquipmentList;