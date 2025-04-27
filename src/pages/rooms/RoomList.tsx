import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import React, { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { roomService } from "@/services/roomService";
import { Room } from "@/types/room";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import ReserveRoomForm from "@/components/rooms/ReserveRoomForm";
import { supabase } from "@/integrations/supabase/client";
import { setHours, setMinutes, subHours } from "date-fns";

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [filterStartHour, setFilterStartHour] = useState<string>("");
  const [filterEndHour, setFilterEndHour] = useState<string>("");

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
    if (!filterDate || !filterStartHour || !filterEndHour) {
      setFilteredRooms(rooms);
      return;
    }

    const startHour = parseInt(filterStartHour.split(":")[0]);
    const endHour = parseInt(filterEndHour.split(":")[0]);

    let startTime = setMinutes(setHours(filterDate, startHour), 0);
    let endTime = setMinutes(setHours(filterDate, endHour), 0);

    startTime = subHours(startTime, 3);
    endTime = subHours(endTime, 3);

    try {
      const availableRooms: Room[] = [];
      for (const room of rooms) {
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("start_time, end_time")
          .eq("room_id", room.id)
          .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

        if (bookingsData.length === 0) {
          availableRooms.push(room);
        }
      }
      setFilteredRooms(availableRooms);
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
      <div className="p-4 space-y-6">
        {/* Mensagem Explicativa */}
        <div className="text-center text-gray-600 mb-4">
          Selecione a data e horário desejado para ver quais salas estão disponíveis para sua reserva.
        </div>

        {/* Filtro */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <input
            type="date"
            className="border p-2 rounded"
            onChange={(e) => setFilterDate(new Date(e.target.value + 'T00:00:00'))}
          />
          <select
            className="border p-2 rounded"
            value={filterStartHour}
            onChange={(e) => setFilterStartHour(e.target.value)}
          >
            <option value="">Hora Inicial</option>
            {[...Array(24)].map((_, i) => (
              <option key={i} value={`${i.toString().padStart(2, "0")}:00`}>
                {i.toString().padStart(2, "0")}:00
              </option>
            ))}
          </select>

          <select
            className="border p-2 rounded"
            value={filterEndHour}
            onChange={(e) => setFilterEndHour(e.target.value)}
          >
            <option value="">Hora Final</option>
            {[...Array(24)].map((_, i) => (
              <option key={i} value={`${i.toString().padStart(2, "0")}:00`}>
                {i.toString().padStart(2, "0")}:00
              </option>
            ))}
          </select>

          <Button onClick={handleFilter}>Filtrar</Button>
          <Button variant="outline" onClick={() => {
            setFilterDate(null);
            setFilterStartHour("");
            setFilterEndHour("");
            setFilteredRooms(rooms);
          }}>
            Limpar Filtro
          </Button>
        </div>

        {/* Lista de Salas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.length > 0 ? (
            filteredRooms.map((room) => (
              <Card key={room.id}>
                <CardHeader>
                  <CardTitle>{room.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {room.room_photos && room.room_photos.length > 0 && (
                    <Swiper navigation modules={[Navigation]} className="w-full h-48 rounded-md mb-2">
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

                  <p className="text-gray-600">{room.description}</p>

                  {/* Características */}
                  <div>
                    <h4 className="font-semibold text-sm">Características:</h4>
                    <ul className="list-disc list-inside text-gray-600 text-sm">
                      <li>Wi-Fi</li>
                      <li>Ar-condicionado</li>
                      <li>Mesa e cadeiras</li>
                    </ul>
                  </div>

                  {/* Valor */}
                  <div className="text-primary text-lg font-bold">
                    {room.price ? `R$ ${room.price.toFixed(2).replace('.', ',')}` : "Preço sob consulta"}
                  </div>

                  <Button onClick={() => setSelectedRoom(room)} className="mt-2">
                    Reservar
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500">
              Nenhuma sala disponível para o filtro selecionado.
            </div>
          )}
        </div>

        {/* Modal de Reserva */}
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
      </div>
    </MainLayout>
  );
};

export default RoomList;
