
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
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        
        console.log("Buscando disponibilidade para sala:", room.id, "data:", dateStr);
        
        // Usar a nova função do banco que considera schedules e carrinho
        const { data: availabilityData, error } = await supabase
          .rpc("get_room_availability", {
            p_room_id: room.id,
            p_date: dateStr
          });

        if (error) {
          console.error("Error fetching room availability:", error);
          return;
        }

        console.log("Dados de disponibilidade recebidos:", availabilityData);

        if (!availabilityData || availabilityData.length === 0) {
          console.log(`Sala ${room.name} fechada na data ${dateStr}`);
          setAvailableHours([]);
          setBlockedHours([]);
          return;
        }

        // Separar horários disponíveis e bloqueados
        const available: string[] = [];
        const blocked: string[] = [];
        
        availabilityData.forEach((slot: any) => {
          if (slot.is_available) {
            available.push(slot.hour);
          } else {
            blocked.push(slot.hour);
          }
        });
        
        console.log("Horários disponíveis:", available);
        console.log("Horários bloqueados:", blocked);

        setAvailableHours(available);
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
