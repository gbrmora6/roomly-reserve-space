
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

interface BookingFormState {
  selectedDate: Date | null;
  startHour: string;
  endHour: string;
  quantity: number;
  bookingTotal: number;
  isSubmitting: boolean;
}

interface UseEquipmentBookingProps {
  equipment: Equipment;
  initialFilters?: {
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
  };
  onClose: () => void;
}

export function useEquipmentBooking({ equipment, initialFilters, onClose }: UseEquipmentBookingProps) {
  const { user } = useAuth();
  const [state, setState] = useState<BookingFormState>({
    selectedDate: initialFilters?.date || null,
    startHour: initialFilters?.startTime || "",
    endHour: initialFilters?.endTime || "",
    quantity: 1,
    bookingTotal: 0,
    isSubmitting: false,
  });
  
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
    setState(prev => ({
      ...prev,
      startHour: "",
      endHour: ""
    }));
  }, [state.selectedDate]);

  // Calculate booking price when relevant fields change
  useEffect(() => {
    if (state.selectedDate && state.startHour && state.endHour && state.quantity) {
      // Calculate duration in hours
      const startParts = state.startHour.split(":");
      const endParts = state.endHour.split(":");
      
      const startHourNum = parseInt(startParts[0]);
      const endHourNum = parseInt(endParts[0]);
      
      let durationHours = endHourNum - startHourNum;
      
      if (durationHours <= 0) {
        durationHours = 0;
      }
      
      // Calculate total price
      const total = equipment.price_per_hour * durationHours * state.quantity;
      setState(prev => ({ ...prev, bookingTotal: total }));
    }
  }, [state.selectedDate, state.startHour, state.endHour, state.quantity, equipment.price_per_hour]);

  // Scroll to sections when selections are made
  useEffect(() => {
    if (state.selectedDate && !state.startHour) {
      setTimeout(() => startHourRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [state.selectedDate]);

  useEffect(() => {
    if (state.startHour) {
      setTimeout(() => endHourRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [state.startHour]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setState(prev => ({ ...prev, selectedDate: date }));
    }
  };

  const handleStartHourSelect = (hour: string) => {
    setState(prev => ({ 
      ...prev, 
      startHour: hour,
      endHour: ""
    }));
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

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para fazer uma reserva");
      return;
    }

    if (!state.selectedDate || !state.startHour || !state.endHour) {
      toast.error("Por favor, selecione data e horários");
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Create date objects for start and end times
      const startDate = new Date(state.selectedDate);
      const endDate = new Date(state.selectedDate);
      
      const [startHours, startMinutes] = state.startHour.split(":");
      const [endHours, endMinutes] = state.endHour.split(":");
      
      startDate.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
      endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      // Create equipment booking with booking_id set to null explicitly
      const { error: equipmentError } = await supabase
        .from("booking_equipment")
        .insert({
          equipment_id: equipment.id,
          quantity: state.quantity,
          user_id: user.id,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          status: "pending",
          booking_id: null // Explicitly set booking_id to null
        });

      if (equipmentError) throw equipmentError;

      toast.success("Reserva realizada com sucesso!");
      onClose();
    } catch (error: any) {
      toast.error(`Erro ao fazer reserva: ${error.message}`);
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  };
  
  const setQuantity = (quantity: number) => {
    setState(prev => ({ ...prev, quantity }));
  };
  
  const setEndHour = (hour: string) => {
    setState(prev => ({ ...prev, endHour: hour }));
  };

  return {
    state,
    refs: { startHourRef, endHourRef },
    availableHours,
    handlers: {
      handleDateSelect,
      handleStartHourSelect,
      setEndHour,
      setQuantity,
      handleSubmit,
      isDateDisabled,
    }
  };
}

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
