
import React from "react";
import { Room } from "@/types/room";
import RoomCard from "@/components/rooms/RoomCard";

interface RoomsGridProps {
  rooms: Room[] | null;
  onReserve: (room: Room) => void;
  isLoggedIn: boolean;
  address: string;
  showFilterMessage: boolean;
}

export const RoomsGrid: React.FC<RoomsGridProps> = ({
  rooms,
  onReserve,
  isLoggedIn,
  address,
  showFilterMessage,
}) => {
  return (
    <>
      {/* Filter guidance message */}
      {showFilterMessage && (
        <div className="mb-6 p-4 bg-gradient-to-r from-roomly-100 to-roomly-50 rounded-lg text-center">
          <p className="text-lg font-medium text-roomly-800">
            Selecione uma data e horário para verificar a disponibilidade das salas
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {rooms && rooms.length > 0 ? (
          rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
            />
          ))
        ) : (
          <p className="col-span-full text-center py-10 text-gray-500">
            Nenhuma sala encontrada com os filtros selecionados.
          </p>
        )}
      </div>
    </>
  );
};
