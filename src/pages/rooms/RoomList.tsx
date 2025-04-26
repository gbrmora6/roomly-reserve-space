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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { format, setHours, setMinutes, subHours } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [filterStartTime, setFilterStartTime] = useState<string>("");
  const [filterEndTime, setFilterEndTime] = useState<string>("");

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

  const handleFilter = async () => {
    if (!filterDate || !filterStartTime || !filterEndTime) return;

    const startHour = parseInt(filterStartTime.split(":"))[0];
    const endHour = parseInt(filterEndTime.split(":"))[0];

    let startTime = setMinutes(setHours(filterDate, startHour), 0);
    let endTime = setMinutes(setHours(filterDate, endHour), 0);

    startTime = subHours(startTime, 3);
    endTime = subHours(endTime, 3);

    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("room_id, start_time, end_time")
      .gte("start_time", startTime.toISOString())
      .lt("end_time", endTime.toISOString());

    if (bookingsError) {
      console.error("Erro ao buscar reservas:", bookingsError);
      return;
    }

    const bookedRoomIds = bookingsData?.map((b) => b.room_id) || [];

    try {
      const allRooms = await roomService.getAllRooms();
      const availableRooms = allRooms.filter((room) => !bookedRoomIds.includes(room.id));
      setRooms(availableRooms);
    } catch (err) {
      console.error("Erro ao filtrar salas:", err);
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
      <div className="flex flex-wrap gap-4 items-center p-4">
        <div>
          <Label>Data</Label>
          <input
            type="date"
            value={filterDate ? format(filterDate, "yyyy-MM-dd") : ""}
            onChange={(e) => setFilterDate(e.target.value ? new Date(e.target.value) : null)}
            className="border rounded px-2 py-1"
          />
        </div>

        <div>
          <Label>Início</Label>
          <Select onValueChange={setFilterStartTime} value={filterStartTime}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Início" />
            </SelectTrigger>
            <SelectContent>
              {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"].map((hour) => (
                <SelectItem key={hour} value={hour}>{hour}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Fim</Label>
          <Select onValueChange={setFilterEndTime} value={filterEndTime}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Fim" />
            </SelectTrigger>
            <SelectContent>
              {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map((hour) => (
                <SelectItem key={hour} value={hour}>{hour}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleFilter}>Filtrar</Button>
      </div>

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
