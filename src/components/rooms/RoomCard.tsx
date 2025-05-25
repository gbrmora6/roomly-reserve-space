
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, Wind, Tv, Bath, Users, MapPin } from "lucide-react";
import { Room } from "@/types/room";
import { formatCurrency } from "@/utils/formatCurrency";

interface RoomCardProps {
  room: Room;
}

const RoomCard: React.FC<RoomCardProps> = ({ room }) => {
  const firstPhoto = room.room_photos?.[0]?.url;

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      {firstPhoto && (
        <div className="aspect-video overflow-hidden rounded-t-lg">
          <img
            src={firstPhoto}
            alt={room.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {room.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {room.description}
        </p>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(room.price_per_hour)}
          </span>
          <span className="text-sm text-muted-foreground">/hora</span>
        </div>

        {/* Comodidades */}
        <div className="flex flex-wrap gap-1">
          {room.has_wifi && (
            <Badge variant="secondary" className="text-xs">
              <Wifi className="h-3 w-3 mr-1" />
              Wi-Fi
            </Badge>
          )}
          {room.has_ac && (
            <Badge variant="secondary" className="text-xs">
              <Wind className="h-3 w-3 mr-1" />
              A/C
            </Badge>
          )}
          {room.has_tv && (
            <Badge variant="secondary" className="text-xs">
              <Tv className="h-3 w-3 mr-1" />
              TV
            </Badge>
          )}
          {room.has_private_bathroom && (
            <Badge variant="secondary" className="text-xs">
              <Bath className="h-3 w-3 mr-1" />
              Banheiro
            </Badge>
          )}
        </div>

        {/* Horário de funcionamento */}
        {room.open_time && room.close_time && (
          <p className="text-xs text-muted-foreground">
            Disponível: {room.open_time} às {room.close_time}
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        <Button asChild className="w-full">
          <Link to={`/rooms/${room.id}`}>
            Ver Detalhes e Reservar
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RoomCard;
