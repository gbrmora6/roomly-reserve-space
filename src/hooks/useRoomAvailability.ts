
import { useState, useEffect } from "react";
import { format, addHours, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Room } from "@/types/room";

export function useRoomAvailability(room: Room, selectedDate: Date | null) {
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [blockedHours, setBlockedHours] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableHours([]);
      setBlockedHours([]);
      return;
    }

    const fetchAvailability = async () => {
      setIsLoading(true);
      try {
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
        
        // Process each booking to block the appropriate hours
        if (bookingsData && bookingsData.length > 0) {
          bookingsData.forEach((booking: any) => {
            // Convert to local date objects for accurate hour extraction
            const start = new Date(booking.start_time);
            const end = new Date(booking.end_time);
            
            // Get hours between start and end time
            const startHourLocal = start.getHours();
            const endHourLocal = end.getHours();
            
            // Add all hours in the range to blocked list
            for (let h = startHourLocal; h < endHourLocal; h++) {
              const formattedHour = `${h.toString().padStart(2, "0")}:00`;
              if (!blocked.includes(formattedHour)) {
                blocked.push(formattedHour);
              }
            }
          });
        }
        
        console.log("All hours:", hours);
        console.log("Blocked hours:", blocked);

        // Check if the room is open on this weekday
        const weekdayNumber = selectedDate.getDay(); // 0-6, where 0 is Sunday
        
        // If room has open_days defined and doesn't include this day, block all hours
        if (room.open_days && room.open_days.length > 0 && !room.open_days.includes(weekdayNumber)) {
          console.log(`Room ${room.name} closed on day ${weekdayNumber}`);
          setAvailableHours([]);
          setBlockedHours(hours);
          return;
        }

        setAvailableHours(hours);
        setBlockedHours(blocked);
      } catch (error) {
        console.error("Error in fetchAvailability:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, room]);

  return { availableHours, blockedHours, isLoading };
}
