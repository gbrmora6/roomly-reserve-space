
import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RoomCard } from "@/components/rooms/RoomCard";
import ReserveRoomForm from "@/components/rooms/ReserveRoomForm";
import { Room } from "@/types/room";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wifi,
  Snowflake,
  Tv,
  Bath,
  Info,
  Calendar as CalendarIcon,
  Clock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

// Time options for the dropdown
const timeOptions = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

const RoomList: React.FC = () => {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    hasWifi: false,
    hasAirConditioning: false,
    hasTV: false,
    hasPrivateBathroom: false,
    date: null as Date | null,
    startTime: null as string | null,
  });
  const [companyAddress, setCompanyAddress] = useState({
    street: "",
    number: "",
    neighborhood: "",
    city: "",
  });

  // Fetch company profile for address
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      const { data, error } = await supabase
        .from("company_profile")
        .select("street, number, neighborhood, city")
        .single();
      
      if (data && !error) {
        setCompanyAddress(data as any);
      }
    };
    
    fetchCompanyProfile();
  }, []);

  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select(`
          *,
          room_photos(*)
        `)
        .order("name");
      
      if (error) throw error;
      
      // Transform the data to add missing properties with default values
      const transformedData = data?.map(room => {
        return {
          ...room,
          // Add properties that might be missing in database but are in Room interface
          has_tv: room.has_tv || false, 
          has_private_bathroom: room.has_private_bathroom || false
        } as Room;
      }) || [];
      
      return transformedData;
    },
  });

  const handleReserve = (room: Room) => {
    if (user) {
      setSelectedRoom(room);
      setIsReserveModalOpen(true);
    }
    // If not logged in, the button will redirect to registration (handled in render)
  };

  const filteredRooms = rooms?.filter((room) => {
    if (filters.hasWifi && !room.has_wifi) return false;
    if (filters.hasAirConditioning && !room.has_ac) return false;
    if (filters.hasTV && !room.has_tv) return false;
    if (filters.hasPrivateBathroom && !room.has_private_bathroom) return false;
    
    // Further filtering by date/time could be implemented here
    // This would require checking room availability against bookings
    
    return true;
  });

  // Format the full address
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

        {/* Improved filter card with better styling */}
        <Card className="mb-8 bg-white shadow-lg border-roomly-100 overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3">
                <h2 className="text-xl font-semibold mb-4 text-roomly-700">Filtrar Salas</h2>
                <p className="text-gray-600 mb-4 text-lg">
                  Selecione os filtros abaixo para encontrar a sala ideal para suas necessidades
                </p>
              </div>

              {/* Date and time filters */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Data e Horário</h3>
                
                {/* Date picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
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
                    <PopoverContent className="w-auto p-0 pointer-events-auto">
                      <Calendar
                        mode="single"
                        selected={filters.date || undefined}
                        onSelect={(date) => setFilters({ ...filters, date })}
                        className="pointer-events-auto"
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Time picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                  <Select
                    value={filters.startTime || ""}
                    onValueChange={(value) => setFilters({ ...filters, startTime: value || null })}
                  >
                    <SelectTrigger className="w-full border-gray-300">
                      <SelectValue placeholder="Selecione um horário">
                        {filters.startTime ? (
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            {filters.startTime}
                          </div>
                        ) : (
                          <span>Selecione um horário</span>
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
              </div>

              {/* Facilities filters */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Comodidades</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filters.hasWifi ? "default" : "outline"}
                    onClick={() => setFilters({ ...filters, hasWifi: !filters.hasWifi })}
                    className="flex items-center gap-2"
                  >
                    <Wifi className="h-4 w-4" />
                    Wi-Fi
                  </Button>
                  <Button
                    variant={filters.hasAirConditioning ? "default" : "outline"}
                    onClick={() => setFilters({ ...filters, hasAirConditioning: !filters.hasAirConditioning })}
                    className="flex items-center gap-2"
                  >
                    <Snowflake className="h-4 w-4" />
                    Ar-Condicionado
                  </Button>
                  <Button
                    variant={filters.hasTV ? "default" : "outline"}
                    onClick={() => setFilters({ ...filters, hasTV: !filters.hasTV })}
                    className="flex items-center gap-2"
                  >
                    <Tv className="h-4 w-4" />
                    TV
                  </Button>
                  <Button
                    variant={filters.hasPrivateBathroom ? "default" : "outline"}
                    onClick={() => setFilters({ ...filters, hasPrivateBathroom: !filters.hasPrivateBathroom })}
                    className="flex items-center gap-2"
                  >
                    <Bath className="h-4 w-4" />
                    Banheiro Privativo
                  </Button>
                </div>
              </div>

              {/* Information box */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="ml-2 text-blue-700 text-sm">
                    <strong>Local das salas:</strong><br />
                    {formatAddress() || "Endereço não disponível"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-2">Erro ao carregar salas</p>
            <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
          </div>
        ) : (
          <>
            {/* Filter guidance message */}
            {filters.date || filters.startTime || filters.hasWifi || filters.hasAirConditioning || filters.hasTV || filters.hasPrivateBathroom ? (
              <div className="mb-6 p-4 bg-gradient-to-r from-roomly-100 to-roomly-50 rounded-lg text-center">
                <p className="text-lg font-medium text-roomly-800">
                  Exibindo salas de acordo com os filtros selecionados
                </p>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-gradient-to-r from-roomly-100 to-roomly-50 rounded-lg text-center">
                <p className="text-lg font-medium text-roomly-800">
                  Utilize os filtros acima para encontrar a sala ideal para você
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRooms && filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                  <RoomCard 
                    key={room.id} 
                    room={room} 
                    onReserve={handleReserve} 
                    isLoggedIn={!!user}
                    address={formatAddress()}
                  />
                ))
              ) : (
                <p className="col-span-full text-center py-10 text-gray-500">
                  Nenhuma sala encontrada com os filtros selecionados.
                </p>
              )}
            </div>
          </>
        )}

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
