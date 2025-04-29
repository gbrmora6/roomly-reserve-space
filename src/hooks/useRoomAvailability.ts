
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
      // Format the date to use in database query
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      // Get all bookings for this room on the selected date
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("room_id", room.id)
        .not("status", "eq", "cancelled")
        .gte("start_time", `${dateStr}T00:00:00`)
        .lt("start_time", `${dateStr}T23:59:59`);

      if (error) {
        console.error("Error fetching bookings:", error);
        return;
      }

      console.log("Room bookings for", dateStr, ":", bookingsData);

      // Extract hours from room's open/close times
      const startHour = room.open_time ? parseInt(room.open_time.split(":")[0]) : 8;
      const endHour = room.close_time ? parseInt(room.close_time.split(":")[0]) : 18;

      // Generate all possible hours
      const hours: string[] = [];
      for (let hour = startHour; hour < endHour; hour++) {
        hours.push(`${hour.toString().padStart(2, "0")}:00`);
      }

      // Mark booked hours
      const blocked: string[] = [];
      bookingsData?.forEach((booking: any) => {
        const start = new Date(booking.start_time);
        const end = new Date(booking.end_time);
        
        // Get hours between start and end time
        for (let h = start.getHours(); h < end.getHours(); h++) {
          blocked.push(`${h.toString().padStart(2, "0")}:00`);
        }
      });

      console.log("Available hours:", hours);
      console.log("Blocked hours:", blocked);

      setAvailableHours(hours);
      setBlockedHours(blocked);
    };

    fetchAvailability();
  }, [selectedDate, room]);

  return { availableHours, blockedHours };
}
