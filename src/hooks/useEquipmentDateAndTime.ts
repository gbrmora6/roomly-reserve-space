import { useState, useRef, useEffect } from "react";
import { addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { createDayBounds } from "@/utils/timezone";

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

  // Function to check if a date should be disabled
  const isDateDisabled = (date: Date) => {
    // Disable dates in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return true;
    }

    // Check if equipment is available on this weekday
    if (equipment.open_days && equipment.open_days.length > 0) {
      const weekdayNumber = date.getDay();
      const weekdayEnum = getWeekdayFromNumber(weekdayNumber);
      return !equipment.open_days.includes(weekdayEnum);
    }

    return false;
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
        // Extract hours from equipment's open/close times or use defaults
        const openTime = equipment.open_time ? equipment.open_time.split(":")[0] : "08";
        const closeTime = equipment.close_time ? equipment.close_time.split(":")[0] : "18";

        // Generate all possible hours
        const hours: string[] = [];
        for (let hour = parseInt(openTime); hour < parseInt(closeTime); hour++) {
          hours.push(`${hour.toString().padStart(2, "0")}:00`);
        }

        // Get bookings for this equipment on the selected date usando bounds locais
        const dayBounds = createDayBounds(selectedDate);

        const { data: bookings, error } = await supabase
          .from('booking_equipment')
          .select('start_time, end_time, quantity, status')
          .eq('equipment_id', equipment.id)
          .not('status', 'eq', 'cancelled')
          .gte('start_time', dayBounds.start)
          .lte('start_time', dayBounds.end);

        if (error) {
          console.error("Error fetching equipment bookings:", error);
          throw error;
        }

        console.log("Equipment bookings for day:", bookings);

        // Calculate blocked hours based on bookings and equipment quantity
        const blocked: string[] = [];
        const hourlyBookings: Record<string, number> = {};

        if (bookings && bookings.length > 0) {
          bookings.forEach(booking => {
            // Convert to date objects
            const start = new Date(booking.start_time);
            const end = new Date(booking.end_time);
            
            // Get hours between start and end time
            const startHourLocal = start.getHours();
            const endHourLocal = end.getHours();
            
            // Add booked quantity to each hour
            for (let h = startHourLocal; h < endHourLocal; h++) {
              const hourKey = `${h.toString().padStart(2, "0")}:00`;
              hourlyBookings[hourKey] = (hourlyBookings[hourKey] || 0) + booking.quantity;
              
              // If all units of this equipment are booked for this hour, block it
              if (hourlyBookings[hourKey] >= equipment.quantity) {
                blocked.push(hourKey);
              }
            }
          });
        }

        console.log("Hourly bookings:", hourlyBookings);
        console.log("Blocked hours:", blocked);
        setAvailableHours(hours);
        setBlockedHours(blocked);

      } catch (error) {
        console.error("Error calculating available hours:", error);
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
