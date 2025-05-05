
import React from "react";
import { formatCurrency } from "@/utils/formatCurrency";

interface RoomDetails {
  name: string;
  price_per_hour: number;
}

interface BookingRoomDetailsProps {
  room: RoomDetails;
}

export const BookingRoomDetails: React.FC<BookingRoomDetailsProps> = ({ room }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Sala Reservada</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Nome da Sala</p>
          <p className="font-medium">{room.name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Preço por hora</p>
          <p className="font-medium">{formatCurrency(room.price_per_hour)}</p>
        </div>
      </div>
    </div>
  );
};
