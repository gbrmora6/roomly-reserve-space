
import { useState } from "react";
import { format, subHours } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Room } from "@/types/room";

export function useRoomReservation(room: Room, onClose: () => void) {
  const [loading, setLoading] = useState(false);

  const handleReserve = async (startTime: Date, endTime: Date) => {
    setLoading(true);

    const user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      alert("Usuário não autenticado.");
      setLoading(false);
      return;
    }

    // Convert times to UTC-3
    startTime = subHours(startTime, 3);
    endTime = subHours(endTime, 3);

    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("room_id", room.id)
      .not("status", "eq", "cancelled")
      .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

    if (existingBookings && existingBookings.length > 0) {
      alert("Horário já reservado! Escolha outro horário.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      room_id: room.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: "pending",
    });

    if (error) {
      console.error(error);
      alert("Erro ao reservar a sala.");
    } else {
      alert("Reserva realizada com sucesso!");
      onClose();
    }

    setLoading(false);
  };

  return { handleReserve, loading };
}
