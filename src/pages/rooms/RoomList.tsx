
import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RoomCard } from "@/components/rooms/RoomCard";
import ReserveRoomForm from "@/components/rooms/ReserveRoomForm";
import { Room } from "@/types/room";
import {
  Wifi,
  Snowflake,
  Tv,
  Bath,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const RoomList: React.FC = () => {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    hasWifi: false,
    hasAirConditioning: false,
    hasTV: false,
    hasPrivateBathroom: false,
  });

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
      return data as Room[];
    },
  });

  const handleReserve = (room: Room) => {
    setSelectedRoom(room);
    setIsReserveModalOpen(true);
  };

  const filteredRooms = rooms?.filter((room) => {
    if (filters.hasWifi && !room.has_wifi) return false;
    if (filters.hasAirConditioning && !room.has_ac) return false;
    if (filters.hasTV && !room.has_tv) return false;
    if (filters.hasPrivateBathroom && !room.has_private_bathroom) return false;
    return true;
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center md:text-left">Salas Disponíveis</h1>

        <div className="mb-6 bg-white p-4 rounded-lg shadow flex flex-wrap gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRooms && filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <RoomCard key={room.id} room={room} onReserve={handleReserve} />
              ))
            ) : (
              <p className="col-span-full text-center py-10">
                Nenhuma sala encontrada com os filtros selecionados.
              </p>
            )}
          </div>
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
