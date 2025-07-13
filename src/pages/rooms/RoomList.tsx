
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
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

  // Query para buscar salas ativas
  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ["rooms", selectedCity],
    queryFn: async () => {
      console.log("Buscando salas ativas...");

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
      { icon: Clock, label: "Horários", value: "Ver detalhes" },
    ],
  })) || [];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Salas Disponíveis"
          description="Encontre e reserve a sala perfeita para suas necessidades"
        />

        {/* Filtros simplificados */}
        <Card className="mb-8 glass-intense border-primary/20 shadow-3d">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Barra de busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar salas por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 text-base glass-intense border-primary/20 focus:border-electric-blue/50 focus:shadow-glow transition-all duration-200"
                />
              </div>
              
              {/* Filtro de cidade */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Cidade:</label>
                <div className="w-64">
                  <CityFilter
                    selectedCity={selectedCity}
                    onCityChange={setSelectedCity}
                    placeholder="Todas as cidades"
                  />
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
