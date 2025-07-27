import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { Room } from "@/types/room";
import { formatCurrency } from "@/utils/formatCurrency";
import { useCompanyAddress } from "@/hooks/useCompanyAddress";

interface RoomCardProps {
  room: Room;
}

const RoomCard: React.FC<RoomCardProps> = ({ room }) => {
  const firstPhoto = room.room_photos?.[0]?.url;
  const { formatAddress } = useCompanyAddress();

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 flex flex-col h-full overflow-hidden">
      {firstPhoto && (
        <img
          src={firstPhoto}
          alt={room.name}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="flex-1 flex flex-col p-5">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg text-gray-900">{room.name}</span>
          </div>
          <p className="text-gray-600 text-sm mb-2 line-clamp-2">{room.description}</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl font-semibold text-gray-900">{formatCurrency(room.price_per_hour)}</span>
            <span className="text-sm text-gray-500">/ hora</span>
          </div>
          {formatAddress() && (
            <div className="flex items-center gap-1 mb-2">
              <MapPin className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">{formatAddress()}</span>
            </div>
          )}
        </div>
        <div className="flex justify-end mt-2">
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2 rounded-md">
            <Link to={`/rooms/${room.id}`}>Reservar Sala</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
