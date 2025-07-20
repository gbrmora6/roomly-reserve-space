import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type EquipmentSchedule = {
  id: string;
  equipment_id: string;
  weekday: Database["public"]["Enums"]["weekday"];
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
};

export function useEquipmentSchedule(equipmentId: string) {
  const [schedules, setSchedules] = useState<EquipmentSchedule[]>([]);

  useEffect(() => {
    const fetchSchedules = async () => {
      const { data: schedulesData, error } = await supabase
        .from("equipment_schedules")
        .select("*")
        .eq("equipment_id", equipmentId);

      if (error) {
        console.error("Erro ao buscar horários do equipamento:", error);
        return;
      }
      setSchedules(schedulesData || []);
    };

    fetchSchedules();
  }, [equipmentId]);

  return schedules;
}