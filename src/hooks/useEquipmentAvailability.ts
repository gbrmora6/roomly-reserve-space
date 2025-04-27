
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useEquipmentAvailability(startTime: Date | null, endTime: Date | null) {
  const [availableEquipment, setAvailableEquipment] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    available: number;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEquipment = async () => {
      if (!startTime || !endTime) {
        setAvailableEquipment([]);
        return;
      }

      setLoading(true);
      
      try {
        const { data: equipment, error } = await supabase
          .from("equipment")
          .select("*");

        if (error) throw error;

        const availabilityPromises = equipment.map(async (item) => {
          const { data: result } = await supabase.rpc('check_equipment_availability', {
            p_equipment_id: item.id,
            p_start_time: startTime.toISOString(),
            p_end_time: endTime.toISOString(),
            p_requested_quantity: 1
          });

          return {
            ...item,
            available: result ? item.quantity : 0
          };
        });

        const availabilityResults = await Promise.all(availabilityPromises);
        setAvailableEquipment(availabilityResults);
      } catch (error) {
        console.error("Error fetching equipment availability:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [startTime, endTime]);

  return { availableEquipment, loading };
}
