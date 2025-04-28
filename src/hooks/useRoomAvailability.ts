
import { useState, useEffect } from "react";
import { format, addHours, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Room } from "@/types/room";

export function useRoomAvailability(room: Room, selectedDate: Date | null) {
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [blockedHours, setBlockedHours] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableHours([]);
      setBlockedHours([]);
      return;
    }

    const fetchAvailability = async () => {
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("room_id", room.id)
        .not("status", "eq", "cancelled")
        .gte("start_time", `${format(selectedDate, "yyyy-MM-dd")}T00:00:00`)
        .lt("start_time", `${format(selectedDate, "yyyy-MM-dd")}T23:59:59`);

      const startHour = room.open_time ? parseInt(room.open_time.split(":")[0]) : 8;
      const endHour = room.close_time ? parseInt(room.close_time.split(":")[0]) : 18;

      const hours: string[] = [];
      for (let hour = startHour; hour < endHour; hour++) {
        hours.push(`${hour.toString().padStart(2, "0")}:00`);
      }

      const blocked: string[] = [];
      bookingsData?.forEach((booking: any) => {
        const start = parseInt(booking.start_time.split("T")[1].split(":")[0]);
        const end = parseInt(booking.end_time.split("T")[1].split(":")[0]);
        for (let i = start; i < end; i++) {
          blocked.push(`${i.toString().padStart(2, "0")}:00`);
        }
      });

      setAvailableHours(hours);
      setBlockedHours(blocked);
    };

    fetchAvailability();
  }, [selectedDate, room]);

  return { availableHours, blockedHours };
}
