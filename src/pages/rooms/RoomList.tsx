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
import { format, setHours, setMinutes, subHours , addHours } from "date-fns";
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
  if (!filterDate || !filterStartTime || !filterEndTime) {
    alert("Por favor, selecione data e horários para filtrar.");
    return;
  }

  const startHour = parseInt(filterStartTime.split(":")[0]);
  const endHour = parseInt(filterEndTime.split(":")[0]);

  let startTime = new Date(filterDate);
  let endTime = new Date(filterDate);

  startTime.setHours(startHour, 0, 0, 0);
  endTime.setHours(endHour, 0, 0, 0);

  // 👇 Aqui é o ajuste importante para o horário UTC
  const utcStart = addHours(startTime, 3);
  const utcEnd = addHours(endTime, 3);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("room_id, start_time, end_time")
    .gte("start_time", utcStart.toISOString())
    .lt("end_time", utcEnd.toISOString());

  if (error) {
    console.error("Erro ao buscar reservas:", error);
    return;
  }

  const unavailableRoomIds = bookings?.map((b) => b.room_id) || [];

  const { data: allRooms, error: roomsError } = await supabase
    .from("rooms")
    .select("*, room_photos(id, url)")
    .order("created_at", { ascending: false });

  if (roomsError) {
    console.error("Erro ao buscar salas:", roomsError);
    return;
  }

  const filteredRooms = (allRooms || []).filter(
    (room) => !unavailableRoomIds.includes(room.id)
  );

  setRooms(filteredRooms);
};

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
