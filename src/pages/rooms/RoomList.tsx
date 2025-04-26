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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import ReserveRoomForm from "@/components/rooms/ReserveRoomForm";
import { Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { format, setHours, setMinutes, subHours } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStartHour, setSelectedStartHour] = useState<string>("");
  const [selectedEndHour, setSelectedEndHour] = useState<string>("");

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await roomService.getAllRooms();
        setRooms(data || []);
        setFilteredRooms(data || []);
      } catch (err) {
        console.error("Erro ao carregar salas:", err);
        setError("Não foi possível carregar as salas. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const handleFilter = async () => {
    if (!selectedDate || !selectedStartHour || !selectedEndHour) {
      setFilteredRooms(rooms);
      return;
    }

    const startHour = parseInt(selectedStartHour.split(":")[0], 10);
    const endHour = parseInt(selectedEndHour.split(":")[0], 10);

    if (endHour <= startHour) {
      alert("O horário final deve ser depois do horário inicial.");
      return;
    }

    // Corrigir fuso horário (-3 horas)
    let startTime = subHours(setMinutes(setHours(selectedDate, startHour), 0), 3);
    let endTime = subHours(setMinutes(setHours(selectedDate, endHour), 0), 3);

    try {
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("room_id, start_time, end_time")
        .gte("start_time", startTime.toISOString())
        .lt("end_time", endTime.toISOString());

      if (bookingsError) {
        console.error(bookingsError);
        return;
      }

      const bookedRoomIds = bookings?.map(b => b.room_id) || [];

      const available = rooms.filter(room => !bookedRoomIds.includes(room.id));
      setFilteredRooms(available);
    } catch (error) {
      console.error("Erro ao filtrar salas:", error);
    }
  };

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
      <div className="p-4 space-y-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <Label>Data</Label>
            <Input
              type="date"
              onChange={(e) => setSelectedDate(new Date(e.target.value + "T00:00:00"))}
            />
          </div>
          <div>
            <Label>Início</Label>
            <Input
              type="time"
              onChange={(e) => setSelectedStartHour(e.target.value)}
            />
          </div>
          <div>
            <Label>Fim</Label>
            <Input
              type="time"
              onChange={(e) => setSelectedEndHour(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleFilter}>Filtrar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.length > 0 ? (
            filteredRooms.map((room) => (
              <Card key={room.id}>
                <CardHeader>
                  <CardTitle>{room.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {room.room_photos && room.room_photos.length > 0 && (
                    <Swiper navigation modules={[Navigation]} className="w-full h-48 rounded-md mb-4">
                      {room.room_photos.map((photo) => (
                        <SwiperSlide key={photo.id}>
                          <img src={photo.url} alt="Foto da sala" className="w-full h-48 object-cover rounded-md" />
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
            <div className="col-span-full text-center text-gray-500">Nenhuma sala disponível nesse horário.</div>
          )}
        </div>

        <Dialog open={!!selectedRoom} onOpenChange={(open) => !open && setSelectedRoom(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reservar Sala</DialogTitle>
            </DialogHeader>
            {selectedRoom && <ReserveRoomForm room={selectedRoom} onClose={() => setSelectedRoom(null)} />}
            <DialogClose />
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default RoomList;
