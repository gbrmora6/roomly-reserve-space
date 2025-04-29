
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

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
  description: string | null;
  quantity: number;
  price_per_hour: number;
  available: number;
  open_time?: string;
  close_time?: string;
  open_days?: WeekdayEnum[];
}

interface FilterState {
  date: Date | null;
  startTime: string | null;
  endTime: string | null;
}

export const useEquipmentFiltering = () => {
  const [filters, setFilters] = useState<FilterState>({
    date: null,
    startTime: null,
    endTime: null,
  });

  const { data: equipments, isLoading, error, refetch } = useQuery({
    queryKey: ["equipments", filters],
    queryFn: async () => {
      try {
        if (filters.date && filters.startTime && filters.endTime) {
          // Create date objects for filtering
          const startDateTime = new Date(filters.date);
          const [startHours, startMinutes] = filters.startTime.split(':');
          startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

          const endDateTime = new Date(filters.date);
          const [endHours, endMinutes] = filters.endTime.split(':');
          endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

          // Get weekday number (0-6, where 0 is Sunday)
          const weekdayNumber = filters.date.getDay();
          // Convert to weekday enum
          const weekdayEnum = getWeekdayFromNumber(weekdayNumber);
          
          console.log("Filtering equipments for date:", startDateTime.toISOString().split('T')[0]);
          console.log("Start time:", startDateTime.toISOString());
          console.log("End time:", endDateTime.toISOString());
          console.log("Weekday enum:", weekdayEnum);

          // Get all equipment
          const { data: allEquipments, error: equipmentsError } = await supabase
            .from('equipment')
            .select('*')
            .order('name');

          if (equipmentsError) throw equipmentsError;

          // Filter equipment that are open on the selected weekday
          const openEquipments = allEquipments.filter(equipment => {
            // If equipment has no open_days, assume it's open all days
            if (!equipment.open_days || equipment.open_days.length === 0) return true;
            
            // Check if the equipment is open on this day
            return equipment.open_days.includes(weekdayEnum);
          });

          // Get bookings that overlap with the selected time
          const { data: bookings, error: bookingsError } = await supabase
            .from('booking_equipment')
            .select(`
              equipment_id,
              quantity,
              bookings (
                start_time,
                end_time,
                status
              )
            `)
            .not('bookings.status', 'eq', 'cancelled')
            .lte('bookings.start_time', endDateTime.toISOString())
            .gte('bookings.end_time', startDateTime.toISOString());

          if (bookingsError) throw bookingsError;

          // Calculate availability for each equipment
          const equipmentWithAvailability = openEquipments.map(equipment => {
            // Find bookings for this equipment
            const equipmentBookings = bookings?.filter(booking => 
              booking.equipment_id === equipment.id && 
              booking.bookings && 
              booking.bookings.status !== 'cancelled'
            ) || [];
            
            // Calculate total booked quantity
            const totalBooked = equipmentBookings.reduce((sum, booking) => sum + booking.quantity, 0);
            
            // Calculate available quantity
            const available = Math.max(0, equipment.quantity - totalBooked);
            
            return { ...equipment, available };
          });

          // Filter to only show equipment with available quantities
          const availableEquipments = equipmentWithAvailability.filter(item => item.available > 0);
          
          console.log("Available equipment count:", availableEquipments.length);
          return availableEquipments;
        }

        // If no filters, get all equipment
        const { data, error } = await supabase
          .from('equipment')
          .select('*')
          .order('name');
          
        if (error) throw error;
        
        return data.map(equipment => ({
          ...equipment,
          available: equipment.quantity
        }));
      } catch (error) {
        console.error("Error in equipment filtering query:", error);
        throw error;
      }
    },
  });

  const handleFilter = () => {
    refetch();
  };

  const handleClearFilters = () => {
    setFilters({
      date: null,
      startTime: null,
      endTime: null,
    });
  };

  return {
    filters,
    setFilters,
    equipments,
    isLoading,
    error,
    handleFilter,
    handleClearFilters,
  };
};
