
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { Wifi, Snowflake, Tv, Bath, MapPin } from "lucide-react";
import "swiper/css";
import "swiper/css/navigation";
import { Room } from "@/types/room";
import { Link } from "react-router-dom";

interface RoomCardProps {
  room: Room;
  onReserve: (room: Room) => void;
  isLoggedIn: boolean;
  address: string;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onReserve, isLoggedIn, address }) => {
  return (
    <Card className="hover:shadow-xl transition-all duration-300 overflow-hidden border-roomly-200">
      <CardHeader className="bg-gradient-to-r from-roomly-50 to-roomly-100 p-4">
        <CardTitle className="text-center text-roomly-800">{room.name}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        {room.room_photos && room.room_photos.length > 0 && (
          <Swiper 
            navigation 
            modules={[Navigation]} 
            className="w-full h-48 rounded-md mb-4"
            loop={true}
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

        <p className="text-gray-600 text-sm leading-relaxed">{room.description}</p>

        {/* Address section */}
        {address && (
          <div className="flex items-start mt-2 p-2 bg-gray-50 rounded-md">
            <MapPin size={18} className="text-roomly-600 mt-0.5 flex-shrink-0" />
            <p className="text-gray-600 text-xs ml-1">{address}</p>
          </div>
        )}

        {/* Only show price if user is logged in */}
        {isLoggedIn && room.price_per_hour && (
          <p className="text-roomly-600 font-bold text-lg">
            {Number(room.price_per_hour).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}{" "}
            / hora
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {room.has_wifi && (
            <div className="flex items-center gap-1 bg-roomly-50 px-2 py-1 rounded-full text-xs text-roomly-700">
              <Wifi size={12} /> Wifi
            </div>
          )}
          {room.has_ac && (
            <div className="flex items-center gap-1 bg-roomly-50 px-2 py-1 rounded-full text-xs text-roomly-700">
              <Snowflake size={12} /> Ar-Condicionado
            </div>
          )}
          {room.has_tv && (
            <div className="flex items-center gap-1 bg-roomly-50 px-2 py-1 rounded-full text-xs text-roomly-700">
              <Tv size={12} /> TV
            </div>
          )}
          {room.has_private_bathroom && (
            <div className="flex items-center gap-1 bg-roomly-50 px-2 py-1 rounded-full text-xs text-roomly-700">
              <Bath size={12} /> Banheiro Privativo
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="bg-white p-4 border-t border-gray-100">
        {isLoggedIn ? (
          <Button 
            className="w-full bg-roomly-600 hover:bg-roomly-700 transition-colors" 
            onClick={() => onReserve(room)}
          >
            Reservar
          </Button>
        ) : (
          <Button asChild className="w-full bg-roomly-600 hover:bg-roomly-700 transition-colors">
            <Link to="/register">Cadastre-se</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
