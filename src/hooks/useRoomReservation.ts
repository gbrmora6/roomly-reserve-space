
import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Room } from "@/types/room";
import { toast } from "@/hooks/use-toast";

export function useRoomReservation(room: Room, onClose: () => void) {
  const [loading, setLoading] = useState(false);

  const handleReserve = async (startTime: Date, endTime: Date) => {
    setLoading(true);

    const user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Usuário não autenticado."
      });
      setLoading(false);
      return null;
    }

    try {
      // Check for overlapping bookings
      const { data: existingBookings, error: queryError } = await supabase
        .from("bookings")
        .select("*")
        .eq("room_id", room.id)
        .not("status", "eq", "cancelled")
        .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

      if (queryError) {
        throw queryError;
      }

      if (existingBookings && existingBookings.length > 0) {
        toast({
          variant: "destructive",
          title: "Horário indisponível",
          description: "Horário já reservado! Escolha outro horário."
        });
        setLoading(false);
        return null;
      }

      // Create the booking
      const { data, error } = await supabase.from("bookings").insert({
        user_id: user.id,
        room_id: room.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "pending",
      }).select().single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        variant: "destructive",
        title: "Erro ao reservar",
        description: error.message || "Ocorreu um erro ao reservar a sala."
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { handleReserve, loading };
}
