
import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RoomFilters } from "@/components/rooms/RoomFilters";
import { RoomsGrid } from "@/components/rooms/RoomsGrid";
import ReserveRoomForm from "@/components/rooms/ReserveRoomForm";
import { Room } from "@/types/room";
import { useAuth } from "@/contexts/AuthContext";
import { roomService } from "@/services/roomService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const RoomList: React.FC = () => {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  
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

      // Se tem filtros de data e horário, buscar salas disponíveis
      if (filters.date && filters.startTime && filters.endTime) {
        const startDate = new Date(filters.date);
        const [startHours, startMinutes] = filters.startTime.split(':');
        startDate.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

        const endDate = new Date(filters.date);
        const [endHours, endMinutes] = filters.endTime.split(':');
        endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

        // Número do dia da semana (0-6, onde 0 é domingo)
        const weekdayNumber = filters.date.getDay();
        
        console.log("Filtrando salas para data:", filters.date);
        console.log("Horário de início:", startDate.toISOString());
        console.log("Horário de término:", endDate.toISOString());
        console.log("Número do dia da semana:", weekdayNumber);

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

          // Filtrar salas abertas no dia da semana selecionado
          const openRooms = allRooms.filter(room => {
            // Se a sala não tem dias definidos, assume que está aberta todos os dias
            if (!room.open_days || room.open_days.length === 0) return true;
            
            // Verificar se a sala está aberta neste dia
            return room.open_days.includes(weekdayNumber);
          });

          // Buscar reservas que conflitam com o horário selecionado
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('room_id')
            .not('status', 'eq', 'cancelled')
            .lte('start_time', endDate.toISOString())
            .gte('end_time', startDate.toISOString());

          if (bookingsError) {
            console.error("Erro ao buscar reservas:", bookingsError);
            throw bookingsError;
          }

          console.log("Reservas encontradas:", bookings);
          const bookedRoomIds = bookings.map(booking => booking.room_id);
          console.log("IDs das salas reservadas:", bookedRoomIds);

          // Filtrar salas não reservadas
          const availableRooms = openRooms.filter(room => !bookedRoomIds.includes(room.id));
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
  const handleReserve = (room: Room) => {
    if (user) {
      setSelectedRoom(room);
      setIsReserveModalOpen(true);
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

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center md:text-left bg-gradient-to-r from-roomly-600 to-roomly-800 text-transparent bg-clip-text">
          Salas Disponíveis
        </h1>

        {/* Componente de filtros */}
        <RoomFilters 
          filters={filters} 
          setFilters={setFilters} 
          onFilter={handleFilter}
          onClear={handleClearFilters}
        />

        {/* Estados de carregamento e erro */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-2">Erro ao carregar salas</p>
          </div>
        ) : (
          // Grid de salas
          <RoomsGrid
            rooms={rooms}
            onReserve={handleReserve}
            isLoggedIn={!!user}
            address={formatAddress()}
            showFilterMessage={!filters.date && !filters.startTime && !filters.endTime}
          />
        )}

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
