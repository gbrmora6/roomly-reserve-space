
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { RoomSchedule } from "@/types/room";

export function useRoomSchedule(roomId: string) {
  const [schedules, setSchedules] = useState<RoomSchedule[]>([]);

  useEffect(() => {
    const fetchSchedules = async () => {
      const { data: schedulesData, error } = await supabase
        .from("room_schedules")
        .select("*")
        .eq("room_id", roomId);

      if (error) {
        console.error("Erro ao buscar horários da sala:", error);
        return;
      }
      setSchedules(schedulesData || []);
    };

    fetchSchedules();
  }, [roomId]);

  return schedules;
}
