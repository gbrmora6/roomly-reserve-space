
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type WeekdayEnum = Database["public"]["Enums"]["weekday"];

interface Equipment {
  id: string;
  name: string;
  description: string | null;
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
  initialDate,
  initialStartTime, 
  initialEndTime
}: UseEquipmentDateAndTimeProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || null);
  const [startHour, setStartHour] = useState<string>(initialStartTime || "");
  const [endHour, setEndHour] = useState<string>(initialEndTime || "");
  
  const startHourRef = useRef<HTMLDivElement>(null);
  const endHourRef = useRef<HTMLDivElement>(null);

  // Generate available hours based on equipment settings
  const getAvailableHours = () => {
    if (!equipment.open_time || !equipment.close_time) {
      return Array.from({ length: 16 }, (_, i) => {
        const hour = i + 7;
        return `${hour.toString().padStart(2, '0')}:00`;
      });
    }

    const startHour = parseInt(equipment.open_time.split(":")[0]);
    const endHour = parseInt(equipment.close_time.split(":")[0]);
    
    return Array.from({ length: endHour - startHour }, (_, i) => {
      const hour = i + startHour;
      return `${hour.toString().padStart(2, '0')}:00`;
    });
  };

  const availableHours = getAvailableHours();

  // Reset time selections when date changes
  useEffect(() => {
    if (selectedDate) {
      setStartHour("");
      setEndHour("");
    }
  }, [selectedDate]);

  // Scroll to sections when selections are made
  useEffect(() => {
    if (selectedDate && !startHour) {
      setTimeout(() => startHourRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (startHour) {
      setTimeout(() => endHourRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [startHour]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleStartHourSelect = (hour: string) => {
    setStartHour(hour);
    setEndHour("");
  };

  const setEndHourValue = (hour: string) => {
    setEndHour(hour);
  };

  const isDateDisabled = (date: Date) => {
    if (!equipment.open_days || equipment.open_days.length === 0) {
      return false;
    }
    
    const weekday = format(date, "eeee", { locale: ptBR }).toLowerCase();
    const weekdayEnglish = {
      'segunda-feira': 'monday',
      'terça-feira': 'tuesday',
      'quarta-feira': 'wednesday',
      'quinta-feira': 'thursday',
      'sexta-feira': 'friday',
      'sábado': 'saturday',
      'domingo': 'sunday'
    }[weekday] || weekday;
    
    return !equipment.open_days.includes(weekdayEnglish as WeekdayEnum);
  };

  return {
    selectedDate,
    startHour,
    endHour,
    startHourRef,
    endHourRef,
    availableHours,
    handleDateSelect,
    handleStartHourSelect,
    setEndHour: setEndHourValue,
    isDateDisabled
  };
}
