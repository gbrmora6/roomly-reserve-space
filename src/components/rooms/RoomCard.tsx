import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { Wifi, Snowflake, Tv, Bath } from "lucide-react";
import "swiper/css";
import "swiper/css/navigation";
import { Room } from "@/types/room";

interface RoomCardProps {
  room: Room;
  onReserve: (room: Room) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onReserve }) => {
  return (
    <Card className="hover:shadow-2xl transition-all">
      <CardHeader>
        <CardTitle className="text-center">{room.name}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {room.room_photos && room.room_photos.length > 0 && (
          <Swiper navigation modules={[Navigation]} className="w-full h-40 rounded-md">
            {room.room_photos.map((photo) => (
              <SwiperSlide key={photo.id}>
                <img
                  src={photo.url}
                  alt="Foto da sala"
                  className="w-full h-40 object-cover rounded-md"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        )}

        <p className="text-gray-600 text-sm">{room.description}</p>

        {room.price_per_hour && (
          <p className="text-blue-600 font-bold">
            {Number(room.price_per_hour).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}{" "}
            / hora
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-gray-600 text-sm mt-2">
          {room.has_wifi && (
            <div className="flex items-center gap-1">
              <Wifi size={16} /> Wifi
            </div>
          )}
          {room.has_air_conditioning && (
            <div className="flex items-center gap-1">
              <Snowflake size={16} /> Ar-Condicionado
            </div>
          )}
          {room.has_tv && (
            <div className="flex items-center gap-1">
              <Tv size={16} /> TV
            </div>
          )}
          {room.has_private_bathroom && (
            <div className="flex items-center gap-1">
              <Bath size={16} /> Banheiro Privativo
            </div>
          )}
        </div>

        <Button className="w-full mt-4" onClick={() => onReserve(room)}>
          Reservar
        </Button>
      </CardContent>
    </Card>
  );
};
