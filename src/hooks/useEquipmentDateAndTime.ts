import { useState, useRef, useEffect } from "react";
import { addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase";
import { createDayBounds } from "@/utils/timezone";
import { useEquipmentSchedule } from "@/hooks/useEquipmentSchedule";

type WeekdayEnum = Database["public"]["Enums"]["weekday"];

// Helper function to convert numeric day to weekday enum
const getWeekdayFromNumber = (day: number): WeekdayEnum => {
  const weekdays: WeekdayEnum[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ];
  return weekdays[day];
};

interface Equipment {
  id: string;
  name: string;
  quantity: number;
  price_per_hour: number;
  open_time?: string;
  close_time?: string;
  open_days?: WeekdayEnum[];
}

interface UseEquipmentDateAndTimeProps {
  equipment: Equipment;
  initialDate?: Date | null;
  initialStartTime?: string | null;
  initialEndTime?: string | null;
}

export function useEquipmentDateAndTime({
  equipment,
  initialDate = null,
  initialStartTime = null,
  initialEndTime = null,
}: UseEquipmentDateAndTimeProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const [startHour, setStartHour] = useState<string | null>(initialStartTime);
  const [endHour, setEndHour] = useState<string | null>(initialEndTime);
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [blockedHours, setBlockedHours] = useState<string[]>([]);
  const startHourRef = useRef<HTMLDivElement>(null);
  const endHourRef = useRef<HTMLDivElement>(null);
  const equipmentSchedules = useEquipmentSchedule(equipment.id);

  // Função para verificar se o equipamento funciona em um determinado dia da semana
  const isEquipmentOpenOnDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado
    
    // Primeiro, verificar se há schedules específicos para este dia
    if (equipmentSchedules.length > 0) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      
      // Verificar se existe um schedule para este dia da semana
      const hasScheduleForDay = equipmentSchedules.some(schedule => 
        schedule.weekday.toLowerCase() === dayName
      );
      
      return hasScheduleForDay;
    }
    
    // Fallback: usar open_days se disponível
    if (equipment.open_days && equipment.open_days.length > 0) {
      const weekdayEnum = getWeekdayFromNumber(dayOfWeek);
      return equipment.open_days.includes(weekdayEnum);
    }
    
    // Se não há informações específicas, assumir que funciona de segunda a sexta (1-5)
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  };

  // Function to check if a date should be disabled
  const isDateDisabled = (date: Date) => {
    // Disable dates in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return true;
    }

    // Verificar se o equipamento funciona neste dia da semana
    return !isEquipmentOpenOnDay(date);
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setStartHour(null);
      setEndHour(null);
    }
  };

  // Handle start hour selection
  const handleStartHourSelect = (hour: string) => {
    setStartHour(hour);
    setEndHour(null);
  };

  // Fetch available hours when date changes
  useEffect(() => {
    const fetchAvailableHours = async () => {
      if (!selectedDate) {
        setAvailableHours([]);
        setBlockedHours([]);
        return;
      }

      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        
        console.log("Buscando disponibilidade para equipamento:", equipment.id, "data:", dateStr);
        
        // Usar a função do banco que considera schedules e carrinho - igual ao de salas
        const { data: availabilityData, error } = await (supabase as any)
          .rpc("get_equipment_availability", {
            p_equipment_id: equipment.id,
            p_date: dateStr,
            p_requested_quantity: 1
          });

        if (error) {
          console.error("Error fetching equipment availability:", error);
          return;
        }

        console.log("Dados de disponibilidade recebidos:", availabilityData);

        if (!availabilityData || availabilityData.length === 0) {
          console.log(`Equipamento ${equipment.name} fechado na data ${dateStr}`);
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
        console.error("Error in fetchAvailableHours:", error);
        setAvailableHours([]);
        setBlockedHours([]);
      }
    };

    fetchAvailableHours();
  }, [selectedDate, equipment]);

  return {
    selectedDate,
    startHour,
    endHour,
    setEndHour,
    availableHours,
    blockedHours,
    startHourRef,
    endHourRef,
    handleDateSelect,
    handleStartHourSelect,
    isDateDisabled,
  };
}
