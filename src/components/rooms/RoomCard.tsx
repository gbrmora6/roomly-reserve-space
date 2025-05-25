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
            <span className="text-sm text-gray-500">/ hour</span>
          </div>
          {/* Comodidades/Tags */}
          <div className="flex flex-wrap gap-2 mb-2">
            {room.has_wifi && <span className="bg-gray-100 rounded px-2 py-1 text-xs text-gray-700">Wi-Fi</span>}
            {room.has_ac && <span className="bg-gray-100 rounded px-2 py-1 text-xs text-gray-700">A/C</span>}
            {room.has_tv && <span className="bg-gray-100 rounded px-2 py-1 text-xs text-gray-700">TV</span>}
            {room.has_private_bathroom && <span className="bg-gray-100 rounded px-2 py-1 text-xs text-gray-700">Banheiro</span>}
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <Button asChild className="bg-[#23406e] hover:bg-[#1a2e4d] text-white font-semibold px-6 py-2 rounded-md">
            <Link to={`/rooms/${room.id}`}>View Details</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
