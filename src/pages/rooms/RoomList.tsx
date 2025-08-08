
import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReserveRoomForm from "@/components/rooms/ReserveRoomForm";
import { Room } from "@/types/room";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { ListingGrid } from "@/components/shared/ListingGrid";
import { CityFilter } from "@/components/shared/CityFilter";
import { DateFilter } from "@/components/filters/DateFilter";
import { TimeRangeFilter } from "@/components/filters/TimeRangeFilter";
import { useFilteredRooms } from "@/hooks/useFilteredRooms";
import { FilterContainer } from "@/components/shared/FilterContainer";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterGrid } from "@/components/shared/FilterGrid";
import { FilterField } from "@/components/shared/FilterField";
import { FilterActions } from "@/components/shared/FilterActions";
import { Database } from "@/integrations/supabase/types";
import { useCityValidation } from "@/hooks/useCityValidation";
import CityRequiredAlert from "@/components/shared/CityRequiredAlert";
import { CityValidationModal } from "@/components/shared/CityValidationModal";
import { 
  Wifi, 
  Monitor, 
  Coffee, 
  Car, 
  Clock,
  Search,
  MapPin,
  SlidersHorizontal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";




const RoomList: React.FC = () => {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState<string>("all");
  const [endTime, setEndTime] = useState<string>("all");
  const [showCityAlert, setShowCityAlert] = useState(true);
  const [showCityModal, setShowCityModal] = useState(false);

  const { isCityRequired, validateCitySelection } = useCityValidation({
    selectedCity,
    pageName: "salas"
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
      
      // Buscar a primeira branch disponível ou usar dados padrão
      const { data, error } = await supabase
        .from("branches")
        .select("street, number, neighborhood, city")
        .limit(1)
        .maybeSingle();
      
      if (data && !error) {
        console.log("Perfil da empresa encontrado:", data);
        setCompanyAddress(data);
      } else {
        console.log("Nenhum perfil de empresa encontrado, usando dados padrão");
        setCompanyAddress({
          street: "",
          number: "",
          neighborhood: "",
          city: "Cidade não configurada"
        });
      }
    };
    
    fetchCompanyProfile();
  }, []);

  // Query para buscar salas filtradas
  const { data: rooms, isLoading, error } = useFilteredRooms({
    searchTerm,
    selectedCity,
    selectedDate,
    startTime,
    endTime,
  });

  // Handler para reservar sala
  const handleReserve = (id: string) => {
    if (user) {
      // Validar se a cidade foi selecionada antes de permitir a reserva
      if (selectedCity === "all" || !selectedCity) {
        setShowCityModal(true);
        return;
      }
      
      const room = rooms?.find(r => r.id === id);
      if (room) {
        setSelectedRoom(room);
        setIsReserveModalOpen(true);
      }
    }
  };


  // Formatar endereço completo da empresa
  const formatAddress = () => {
    if (!companyAddress.street) return "";
    return `${companyAddress.street}, ${companyAddress.number} - ${companyAddress.neighborhood}, ${companyAddress.city}`;
  };

  // As salas já vêm filtradas do hook useFilteredRooms
  const filteredRooms = rooms;

  // Converter salas para o formato do ItemCard
  const roomsForGrid = filteredRooms?.map(room => ({
    id: room.id,
    title: room.name,
    description: room.description,
    price: room.price_per_hour,
    priceLabel: "por hora",
    images: room.room_photos?.map(photo => photo.url) || [], // Passando todas as imagens
    status: 'available' as const,
    location: room.branches ? 
      `${room.branches.street}, ${room.branches.number} - ${room.branches.neighborhood}, ${room.branches.city}` : 
      formatAddress(),
  })) || [];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader
          title="Salas Disponíveis"
          description="Encontre e reserve a sala perfeita para suas necessidades"
        />
        
        {isCityRequired && showCityAlert && (
          <CityRequiredAlert 
            pageName="salas" 
            onDismiss={() => setShowCityAlert(false)}
          />
        )}
        
        <FilterContainer>
          <SearchBar
            placeholder="Buscar salas por nome ou descrição..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          
          <FilterGrid>
            <FilterField label="Cidade">
              <CityFilter
                selectedCity={selectedCity}
                onCityChange={setSelectedCity}
                placeholder="Todas as cidades"
              />
            </FilterField>
            
            <FilterField label="Data">
              <DateFilter
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </FilterField>
            
            <FilterField label="Horário">
              <TimeRangeFilter
                startTime={startTime}
                endTime={endTime}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
              />
            </FilterField>
          </FilterGrid>
          
          <FilterActions
            onClear={() => {
              setSearchTerm("");
              setSelectedCity("all");
              setSelectedDate(undefined);
              setStartTime("all");
              setEndTime("all");
            }}
            hasActiveFilters={!!(searchTerm || selectedCity !== "all" || selectedDate || startTime !== "all" || endTime !== "all")}
            activeFilterCount={[searchTerm, selectedCity !== "all", selectedDate, startTime !== "all", endTime !== "all"].filter(Boolean).length}
          />
        </FilterContainer>

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

        {/* Modal de validação de cidade */}
        <CityValidationModal
          isOpen={showCityModal}
          onClose={() => setShowCityModal(false)}
          pageName="salas"
        />
      </div>
    </MainLayout>
  );
};

export default RoomList;
