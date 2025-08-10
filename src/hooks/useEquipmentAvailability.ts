
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase";
import { format } from "date-fns";

type WeekdayEnum = Database["public"]["Enums"]["weekday"];

export function useEquipmentAvailability(selectedDate: Date | null, requestedQuantity: number = 1) {
  const [availableEquipment, setAvailableEquipment] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    available: number;
    price_per_hour: number;
    is_active: boolean;
    minimum_interval_minutes?: number;
    advance_booking_hours?: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [blockedHours, setBlockedHours] = useState<string[]>([]);
  const [availableHours, setAvailableHours] = useState<string[]>([]);

  useEffect(() => {
    const fetchEquipmentAvailability = async () => {
      if (!selectedDate) {
        setAvailableEquipment([]);
        setBlockedHours([]);
        setAvailableHours([]);
        return;
      }

      setLoading(true);

      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        
        console.log("Buscando disponibilidade de equipamentos para data:", dateStr);

        // Get all active equipment
        const { data: allEquipment, error: equipmentError } = await supabase
          .from("equipment")
          .select("id, name, description, quantity, price_per_hour, is_active, minimum_interval_minutes, advance_booking_hours")
          .eq("is_active", true)
          .order("name");

        if (equipmentError) {
          console.error("Error fetching equipment:", equipmentError);
          setLoading(false);
          return;
        }

        if (!allEquipment || allEquipment.length === 0) {
          setAvailableEquipment([]);
          setBlockedHours([]);
          setAvailableHours([]);
          setLoading(false);
          return;
        }

        // Get availability for each equipment using the SQL function
        const equipmentAvailabilityPromises = allEquipment.map(async (equipment) => {
          const { data: availabilityData, error } = await (supabase as any)
            .rpc("get_equipment_availability", {
              p_equipment_id: equipment.id,
              p_date: dateStr,
              p_requested_quantity: requestedQuantity
            });

          if (error) {
            console.error(`Error fetching availability for equipment ${equipment.name}:`, error);
            return null;
          }

          return {
            equipment,
            availability: availabilityData || []
          };
        });

        const equipmentAvailabilityResults = await Promise.all(equipmentAvailabilityPromises);
        const validResults = equipmentAvailabilityResults.filter(result => result !== null);

        console.log("Equipment availability results:", validResults);
        
        // Process availability data
        const availableEquipmentList: typeof availableEquipment = [];
        const allAvailableHours = new Set<string>();
        const allBlockedHours = new Set<string>();
        
        validResults.forEach((result: any) => {
          const { equipment, availability } = result;
          
          // Check if equipment has any available hours
          const hasAvailableHours = availability.some((slot: any) => slot.is_available && slot.available_quantity >= requestedQuantity);
          
          if (hasAvailableHours) {
            // Calculate minimum available quantity across all hours
            const minAvailableQuantity = availability
              .filter((slot: any) => slot.is_available)
              .reduce((min: number, slot: any) => Math.min(min, slot.available_quantity), equipment.quantity);
            
            availableEquipmentList.push({
              ...equipment,
              available: Math.max(0, minAvailableQuantity)
            });
          }
          
          // Collect available and blocked hours
          availability.forEach((slot: any) => {
            if (slot.is_available && slot.available_quantity >= requestedQuantity) {
              allAvailableHours.add(slot.hour);
            } else {
              allBlockedHours.add(slot.hour);
            }
          });
        });
        
        // Convert sets to sorted arrays
        const sortedAvailableHours = Array.from(allAvailableHours).sort((a, b) => {
          const hourA = parseInt(a.split(':')[0]);
          const hourB = parseInt(b.split(':')[0]);
          return hourA - hourB;
        });
        
        const sortedBlockedHours = Array.from(allBlockedHours).sort((a, b) => {
          const hourA = parseInt(a.split(':')[0]);
          const hourB = parseInt(b.split(':')[0]);
          return hourA - hourB;
        });
        
        console.log("Available hours:", sortedAvailableHours);
        console.log("Blocked hours:", sortedBlockedHours);
        console.log("Available equipment:", availableEquipmentList.length);
        
        setAvailableHours(sortedAvailableHours);
        setBlockedHours(sortedBlockedHours);
        setAvailableEquipment(availableEquipmentList);
      } catch (error) {
        console.error("Error fetching equipment availability:", error);
        setAvailableEquipment([]);
      } finally {
        setLoading(false);
      }
    };

    if (startTime && endTime) {
      fetchEquipment();
    } else {
      setLoading(false);
    }
  }, [startTime, endTime]);

  return {
    availableEquipment,
    availableHours,
    blockedHours,
    loading,
  };
}
