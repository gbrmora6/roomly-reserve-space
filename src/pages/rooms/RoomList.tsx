
import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReserveRoomForm from "@/components/rooms/ReserveRoomForm";
import { Room } from "@/types/room";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { ListingGrid } from "@/components/shared/ListingGrid";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Wifi, 
  Monitor, 
  Coffee, 
  Car, 
  Clock,
  Users,
  Search
} from "lucide-react";

const RoomList: React.FC = () => {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estado dos filtros incluindo cidade
  const [filters, setFilters] = useState({
    date: null as Date | null,
    startTime: null as string | null,
    endTime: null as string | null,
    city: null as string | null,
  });
  
  // Estado para armazenar endereço da empresa
  const [companyAddress, setCompanyAddress] = useState({
    street: "",
    number: "",
    neighborhood: "",
    city: "",
  });

  // Buscar perfil da empresa para exibir endereço
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      console.log("Buscando perfil da empresa...");
      
      const { data, error } = await supabase
        .from("company_profile")
        .select("street, number, neighborhood, city")
        .single();
      
      if (data && !error) {
        console.log("Perfil da empresa encontrado:", data);
        setCompanyAddress(data);
      } else {
        console.error("Erro ao buscar perfil da empresa:", error);
      }
    };
    
    fetchCompanyProfile();
  }, []);

  // Query para buscar salas com filtros aplicados
  const { data: rooms, isLoading, error, refetch } = useQuery({
    queryKey: ["rooms", filters],
    queryFn: async () => {
      console.log("Buscando salas com filtros:", filters);

      // Se tem filtros de data e horário, buscar salas disponíveis usando get_room_availability
      if (filters.date && filters.startTime && filters.endTime) {
        const dateStr = format(filters.date, 'yyyy-MM-dd');
        const startHour = parseInt(filters.startTime.split(':')[0]);
        const endHour = parseInt(filters.endTime.split(':')[0]);
        
        console.log("Filtrando salas para data:", dateStr);
        console.log("Horário de início:", filters.startTime);
        console.log("Horário de término:", filters.endTime);

        try {
          // Buscar filiais baseado no filtro de cidade
          let branchQuery = supabase.from('branches').select('id');
          if (filters.city) {
            branchQuery = branchQuery.eq('city', filters.city);
          }
          
          const { data: branches, error: branchError } = await branchQuery;
          if (branchError) {
            console.error("Erro ao buscar filiais:", branchError);
            throw branchError;
          }
          
          const branchIds = branches.map(branch => branch.id);
          console.log("IDs das filiais filtradas:", branchIds);

          // Buscar todas as salas ativas das filiais filtradas
          let roomQuery = supabase
            .from('rooms')
            .select(`
              *,
              room_photos (
                id,
                url
              )
            `)
            .eq('is_active', true);
          
          if (branchIds.length > 0) {
            roomQuery = roomQuery.in('branch_id', branchIds);
          }

          const { data: allRooms, error: roomsError } = await roomQuery;

          if (roomsError) {
            console.error("Erro ao buscar salas:", roomsError);
            throw roomsError;
          }

          // Verificar disponibilidade de cada sala usando a função get_room_availability
          const availableRooms = [];
          
          for (const room of allRooms) {
            // Buscar disponibilidade da sala para a data selecionada
            const { data: availability, error: availabilityError } = await supabase
              .rpc('get_room_availability', {
                p_room_id: room.id,
                p_date: dateStr
              });

            if (availabilityError) {
              console.error(`Erro ao verificar disponibilidade da sala ${room.name}:`, availabilityError);
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
                console.log(`Sala ${room.name} disponível para o período solicitado`);
                availableRooms.push(room);
              } else {
                console.log(`Sala ${room.name} não disponível para todo o período solicitado`);
              }
            } else {
              console.log(`Sala ${room.name} fechada na data ${dateStr}`);
            }
          }

          console.log("Salas disponíveis:", availableRooms.length);
          return availableRooms as unknown as Room[];
        } catch (error) {
          console.error("Erro na consulta de filtro de salas:", error);
          throw error;
        }
      }

      // Buscar todas as salas ativas (sem filtros específicos)
      let roomQuery = supabase
        .from('rooms')
        .select(`
          *,
          room_photos (
            id,
            url
          )
        `)
        .eq('is_active', true);

      // Aplicar filtro de cidade se selecionado
      if (filters.city) {
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
        if (branchIds.length > 0) {
          roomQuery = roomQuery.in('branch_id', branchIds);
        }
      }
        
      const { data, error } = await roomQuery;
      if (error) throw error;
      
      return data as unknown as Room[];
    },
  });

  // Handler para reservar sala
  const handleReserve = (id: string) => {
    if (user) {
      const room = rooms?.find(r => r.id === id);
      if (room) {
        setSelectedRoom(room);
        setIsReserveModalOpen(true);
      }
    }
  };

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

  // Formatar endereço completo da empresa
  const formatAddress = () => {
    if (!companyAddress.street) return "";
    return `${companyAddress.street}, ${companyAddress.number} - ${companyAddress.neighborhood}, ${companyAddress.city}`;
  };

  // Filtrar salas por termo de busca
  const filteredRooms = rooms?.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (room.description && room.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Converter salas para o formato do ItemCard
  const roomsForGrid = filteredRooms?.map(room => ({
    id: room.id,
    title: room.name,
    description: room.description,
    price: room.price_per_hour,
    priceLabel: "por hora",
    image: room.room_photos?.[0]?.url,
    status: 'available' as const,
    location: formatAddress(),
    features: [
      { icon: Wifi, label: "Wi-Fi", available: room.has_wifi || false },
      { icon: Monitor, label: "TV", available: room.has_tv || false },
      { icon: Coffee, label: "A/C", available: room.has_ac || false },
      { icon: Car, label: "Banheiro", available: room.has_private_bathroom || false },
    ],
    stats: [
      { icon: Clock, label: "Abertura", value: room.open_time || "N/A" },
      { icon: Clock, label: "Fechamento", value: room.close_time || "N/A" },
    ],
  })) || [];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Salas Disponíveis"
          description="Encontre e reserve a sala perfeita para suas necessidades"
        />

        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={setFilters}
          onFilter={handleFilter}
          onClear={handleClearFilters}
          showDateTimeFilters
          showLocationFilter
          placeholder="Buscar salas..."
        />

        <ListingGrid
          items={roomsForGrid}
          isLoading={isLoading}
          error={error}
          onItemAction={handleReserve}
          actionLabel="Reservar Sala"
          emptyTitle="Nenhuma sala encontrada"
          emptyDescription="Ajuste os filtros ou tente novamente mais tarde"
          emptyIcon={Search}
          variant="room"
          showFiltersMessage={!filters.date && !filters.startTime && !filters.endTime}
          filtersMessage="Selecione uma data e horário para verificar a disponibilidade das salas"
          resultCount={filteredRooms?.length}
        />

        {/* Modal de reserva */}
        <Dialog open={isReserveModalOpen} onOpenChange={setIsReserveModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reservar Sala</DialogTitle>
            </DialogHeader>
            {selectedRoom && (
              <ReserveRoomForm
                room={selectedRoom}
                onClose={() => setIsReserveModalOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default RoomList;
