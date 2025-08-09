
import { useState, useEffect } from "react";
import { format, addHours, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Room } from "@/types/room";

export function useRoomAvailability(room: Room, selectedDate: Date | null) {
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [availableEndTimes, setAvailableEndTimes] = useState<string[]>([]);
  const [blockedHours, setBlockedHours] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableHours([]);
      setAvailableEndTimes([]);
      setBlockedHours([]);
      return;
    }

    const fetchAvailability = async () => {
      setIsLoading(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        
        console.log("Buscando disponibilidade para sala:", room.id, "data:", dateStr);
        
        // Usar a nova função do banco que considera schedules e carrinho
        const { data: availabilityData, error } = await (supabase as any)
          .rpc("get_room_availability", {
            p_room_id: room.id,
            p_date: dateStr
          });

        if (error) {
          console.error("Error fetching room availability:", error);
          // Fallback: try to get basic schedule if function fails
          const { data: schedule, error: scheduleError } = await supabase
            .from("room_schedules")
            .select("start_time, end_time")
            .eq("room_id", room.id)
            .eq("weekday", format(selectedDate, "EEEE").toLowerCase())
            .maybeSingle();
          
          if (!scheduleError && schedule) {
            const startHour = parseInt(schedule.start_time.split(':')[0]);
            const endHour = parseInt(schedule.end_time.split(':')[0]);
            const fallbackHours = [];
            // Incluir o horário de término como disponível
            for (let h = startHour; h <= endHour; h++) {
              fallbackHours.push(`${h.toString().padStart(2, '0')}:00`);
            }
            setAvailableHours(fallbackHours.slice(0, -1)); // Remover último horário dos horários de início
            setAvailableEndTimes(fallbackHours.slice(1)); // Horários de término começam do segundo horário
            setBlockedHours([]);
          } else {
            setAvailableHours([]);
            setAvailableEndTimes([]);
            setBlockedHours([]);
          }
          return;
        }

        console.log("Dados de disponibilidade recebidos:", availabilityData);

        if (!availabilityData || (availabilityData as any[]).length === 0) {
          console.log(`Sala ${room.name} fechada na data ${dateStr}`);
          setAvailableHours([]);
          setAvailableEndTimes([]);
          setBlockedHours([]);
          return;
        }

        // Separar horários disponíveis e bloqueados
        const available: string[] = [];
        const blocked: string[] = [];
        const endTimes: string[] = [];
        
        (availabilityData as any[]).forEach((slot: any) => {
          if (slot.is_available) {
            // Verificar se é um horário de término
            if (slot.blocked_reason === 'Horário de término') {
              endTimes.push(slot.hour);
            } else {
              available.push(slot.hour);
            }
          } else {
            blocked.push(slot.hour);
          }
        });
        
        // Remover horários de término dos horários de início disponíveis
        // mas mantê-los para seleção como horário de término
        const availableForStart = available.filter(hour => !endTimes.includes(hour));
        const allAvailableForEnd = [...available, ...endTimes];
        
        // Ordenar horários cronologicamente
        const sortHours = (hours: string[]) => {
          return hours.sort((a, b) => {
            const hourA = parseInt(a.split(':')[0]);
            const hourB = parseInt(b.split(':')[0]);
            return hourA - hourB;
          });
        };
        
        const sortedAvailableForStart = sortHours(availableForStart);
        const sortedAllAvailableForEnd = sortHours(allAvailableForEnd);
        const sortedBlocked = sortHours(blocked);
        
        console.log("Horários disponíveis para início:", sortedAvailableForStart);
        console.log("Horários disponíveis para término:", sortedAllAvailableForEnd);
        console.log("Horários bloqueados:", sortedBlocked);

        // Armazenar horários de início e término separadamente
        setAvailableHours(sortedAvailableForStart);
        setAvailableEndTimes(sortedAllAvailableForEnd);
        setBlockedHours(sortedBlocked);
      } catch (error) {
        console.error("Error in fetchAvailability:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, room]);

  return { availableHours, availableEndTimes, blockedHours, isLoading };
}
