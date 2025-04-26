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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import ReserveRoomForm from "@/components/rooms/ReserveRoomForm";
import { supabase } from "@/integrations/supabase/client";
import { format, setHours, setMinutes, subHours } from "date-fns";

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startHour, setStartHour] = useState<string>("");
  const [endHour, setEndHour] = useState<string>("");

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
    if (!selectedDate || !startHour || !endHour) return;

    const start = setMinutes(setHours(new Date(selectedDate), parseInt(startHour)), 0);
    const end = setMinutes(setHours(new Date(selectedDate), parseInt(endHour)), 0);

    const startUTC = subHours(start, 3).toISOString();
    const endUTC = subHours(end, 3).toISOString();

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("room_id, start_time, end_time")
      .gte("start_time", `${format(new Date(selectedDate), "yyyy-MM-dd")}T00:00:00`)
      .lt("end_time", `${format(new Date(selectedDate), "yyyy-MM-dd")}T23:59:59`);

    if (bookingsError) {
      console.error("Erro ao buscar reservas:", bookingsError);
      return;
    }

    const unavailableRoomIds = bookings?.filter((booking) => {
      return (
        booking.start_time < endUTC &&
        booking.end_time > startUTC
      );
    }).map(b => b.room_id) || [];

    const availableRooms = rooms.filter(room => !unavailableRoomIds.includes(room.id));
    setFilteredRooms(availableRooms);
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
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded p-2"
          />
          <select value={startHour} onChange={(e) => setStartHour(e.target.value)} className="border rounded p-2">
            <option value="">Início</option>
            {[...Array(24)].map((_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
            ))}
          </select>
          <select value={endHour} onChange={(e) => setEndHour(e.target.value)} className="border rounded p-2">
            <option value="">Fim</option>
            {[...Array(24)].map((_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
            ))}
          </select>
          <Button onClick={handleFilter}>Filtrar</Button>
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
                  <p className="text-sm text-gray-500 mb-4">Capacidade: {room.capacity || "?"} pessoas</p>
                  <Button onClick={() => setSelectedRoom(room)}>Reservar</Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500">
              Nenhuma sala disponível para o filtro selecionado.
            </div>
          )}
        </div>
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
