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
import { format, setHours, setMinutes, subHours } from "date-fns";
import { Wifi, Snowflake, Chair, Table } from "lucide-react";


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
        const { data: bookingsData, error } = await supabase
          .from("bookings")
          .select("start_time, end_time")
          .eq("room_id", room.id)
          .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

        if (error) {
          console.error("Erro ao buscar reservas da sala:", room.id, error);
          continue;
        }

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
      <div className="p-6 space-y-8">

        {/* Texto explicativo do filtro */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">
            Encontre a sala ideal para sua necessidade!
          </h2>
          <p className="text-gray-600 text-md">
            Selecione a data e horários para visualizar as salas disponíveis.
          </p>
        </div>

        {/* Área de Filtros */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 p-4 bg-blue-50 rounded-md shadow-md">
          <input
            type="date"
            className="border p-2 rounded w-40"
            onChange={(e) => setFilterDate(new Date(e.target.value + 'T00:00:00'))}
          />

          <select
            className="border p-2 rounded w-32"
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
            className="border p-2 rounded w-32"
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

        {/* Cards de Salas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.length > 0 ? (
            filteredRooms.map((room) => (
              <Card key={room.id} className="shadow-md hover:shadow-xl transition rounded-lg overflow-hidden">
                {room.room_photos && room.room_photos.length > 0 && (
                  <Swiper navigation modules={[Navigation]} className="w-full h-48">
                    {room.room_photos.map((photo) => (
                      <SwiperSlide key={photo.id}>
                        <img
                          src={photo.url}
                          alt="Foto da sala"
                          className="w-full h-48 object-cover"
                        />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                )}
                <CardHeader className="p-4">
                  <CardTitle className="text-xl">{room.name}</CardTitle>
                  <p className="text-gray-500 text-sm mt-1">{room.description}</p>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  
                  {/* Características com ícones */}
                  <div className="flex flex-wrap gap-4 text-gray-700 text-sm">
                    {room.characteristics?.includes("wifi") && (
                      <div className="flex items-center gap-1">
                        <Wifi size={18} /> Wi-Fi
                      </div>
                    )}
                    {room.characteristics?.includes("ar-condicionado") && (
                      <div className="flex items-center gap-1">
                        <Snowflake size={18} /> Ar-condicionado
                      </div>
                    )}
                    {room.characteristics?.includes("mesa") && (
                      <div className="flex items-center gap-1">
                        <Table size={18} /> Mesa
                      </div>
                    )}
                    {room.characteristics?.includes("cadeira") && (
                      <div className="flex items-center gap-1">
                        <Chair size={18} /> Cadeira
                      </div>
                    )}
                  </div>

                  {/* Preço */}
                  <div className="text-primary text-lg font-bold">
                    {room.price_per_hour !== undefined && room.price_per_hour !== null
                      ? `R$ ${Number(room.price_per_hour).toFixed(2).replace('.', ',')} / hora`
                      : "Preço sob consulta"}
                  </div>

                  <Button className="w-full mt-2" onClick={() => setSelectedRoom(room)}>
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
