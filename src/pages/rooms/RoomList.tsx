import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import React, { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { roomService } from "@/services/roomService";
import { Room } from "@/integrations/supabase/types";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import ReserveRoomForm from "@/components/rooms/ReserveRoomForm";
import { Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await roomService.getAllRooms();
        setRooms(data || []);
      } catch (err) {
        console.error("Erro ao carregar salas:", err);
        setError("Não foi possível carregar as salas. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-96">
          <p>Carregando salas...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-96">
          <p className="text-red-500">{error}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
        {rooms.length > 0 ? (
          rooms.map((room) => (
            <Card key={room.id}>
              <CardHeader>
                <CardTitle>{room.name}</CardTitle>
              </CardHeader>
             <CardContent>
                {room.room_photos && room.room_photos.length > 0 && (
                  <Swiper
                    navigation
                    modules={[Navigation]}
                    className="w-full h-48 rounded-md mb-4"
                  >
                    {room.room_photos.map((photo) => (
                      <SwiperSlide key={photo.id}>
                        <img
                          src={photo.url}
                          alt="Foto da sala"
                          className="w-full h-48 object-cover rounded-md"
                        />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                )}
                <p className="mb-2">{room.description}</p>
                <p className="text-sm text-gray-500 mb-4">
                  Capacidade: {room.capacity || "?"} pessoas
                </p>
                <Button onClick={() => setSelectedRoom(room)}>Reservar</Button>
              </CardContent>

            </Card>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500">
            Nenhuma sala disponível no momento.
          </div>
        )}
      </div>
      <Dialog open={!!selectedRoom} onOpenChange={(open) => !open && setSelectedRoom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservar Sala</DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <ReserveRoomForm room={selectedRoom} onClose={() => setSelectedRoom(null)} />
          )}
          <DialogClose />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default RoomList;
