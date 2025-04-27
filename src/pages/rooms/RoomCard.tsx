import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wifi, Snowflake, Tv, Droplets } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

interface RoomCardProps {
  room: any;
  onReserve: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onReserve }) => {
  return (
    <Card className="overflow-hidden shadow-lg border-gray-200 hover:shadow-2xl transition-all">
      {room.room_photos && room.room_photos.length > 0 && (
        <Swiper navigation modules={[Navigation]} className="w-full h-48">
          {room.room_photos.map((photo: any) => (
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

      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800">
          {room.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 min-h-[60px]">
          {room.description}
        </p>

        {room.price_per_hour && (
          <p className="text-lg font-bold text-roomly-600">
            {Number(room.price_per_hour).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / hora
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-gray-500 text-sm">
          {room.has_wifi && (
            <div className="flex items-center gap-1">
              <Wifi size={16} /> Wifi
            </div>
          )}
          {room.has_air_conditioning && (
            <div className="flex items-center gap-1">
              <Snowflake size={16} /> Ar-condicionado
            </div>
          )}
          {room.has_tv && (
            <div className="flex items-center gap-1">
              <Tv size={16} /> TV
            </div>
          )}
          {room.has_private_bathroom && (
            <div className="flex items-center gap-1">
              <Droplets size={16} /> Banheiro Privativo
            </div>
          )}
        </div>

        <Button onClick={onReserve} className="w-full mt-4">
          Reservar
        </Button>
      </CardContent>
    </Card>
  );
};

export default RoomCard;
