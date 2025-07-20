
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
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Database } from "@/integrations/supabase/types";
import { useCityValidation } from "@/hooks/useCityValidation";
import CityRequiredAlert from "@/components/shared/CityRequiredAlert";
import { 
  Wifi, 
  Monitor, 
  Coffee, 
  Car, 
  Clock,
  Search
} from "lucide-react";




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
      
      const { data, error } = await supabase
        .from("branches")
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
      if (!validateCitySelection()) {
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
      { icon: Clock, label: "Horários", value: "Ver detalhes" },
    ],
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
        
        {/* Filtros simplificados */}
        <Card className="mb-6 md:mb-8 glass-intense border-primary/20 shadow-3d">
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              {/* Barra de busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar salas por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 md:h-11 text-sm md:text-base glass-intense border-primary/20 focus:border-electric-blue/50 focus:shadow-glow transition-all duration-200"
                />
              </div>
              
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 md:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium whitespace-nowrap">Cidade:</label>
                  <div className="w-full sm:w-48">
                    <CityFilter
                      selectedCity={selectedCity}
                      onCityChange={setSelectedCity}
                      placeholder="Todas as cidades"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium whitespace-nowrap">Data:</label>
                  <div className="w-full sm:w-auto">
                    <DateFilter
                      selectedDate={selectedDate}
                      onDateChange={setSelectedDate}
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium whitespace-nowrap">Horário:</label>
                  <div className="w-full sm:w-auto">
                    <TimeRangeFilter
                      startTime={startTime}
                      endTime={endTime}
                      onStartTimeChange={setStartTime}
                      onEndTimeChange={setEndTime}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
      </div>
    </MainLayout>
  );
};

export default RoomList;
