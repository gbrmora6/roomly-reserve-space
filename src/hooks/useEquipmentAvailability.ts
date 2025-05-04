
import { useState, useEffect } from "react";
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

export function useEquipmentAvailability(startTime: Date | null, endTime: Date | null) {
  const [availableEquipment, setAvailableEquipment] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    available: number;
    price_per_hour: number;
    open_time?: string;
    close_time?: string;
    open_days?: WeekdayEnum[];
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [blockedHours, setBlockedHours] = useState<string[]>([]);

  useEffect(() => {
    const fetchEquipment = async () => {
      if (!startTime || !endTime) {
        setAvailableEquipment([]);
        setBlockedHours([]);
        return;
      }

      setLoading(true);

      try {
        // Get the date without time for filtering by weekday
        const selectedDate = new Date(startTime);
        selectedDate.setHours(0, 0, 0, 0);
        
        // Get weekday number (0-6, where 0 is Sunday)
        const weekdayNumber = selectedDate.getDay();
        // Convert to weekday enum
        const weekdayEnum = getWeekdayFromNumber(weekdayNumber);
        
        console.log("Filtering equipment for date:", selectedDate);
        console.log("Start time:", startTime.toISOString());
        console.log("End time:", endTime.toISOString());
        console.log("Weekday enum:", weekdayEnum);

        // Get all equipment
        const { data: allEquipment, error: equipmentError } = await supabase
          .from("equipment")
          .select("*")
          .order("name");

        if (equipmentError) throw equipmentError;

        if (!allEquipment || allEquipment.length === 0) {
          setAvailableEquipment([]);
          setLoading(false);
          return;
        }

        // Filter equipment based on open days
        const openEquipment = allEquipment.filter(equipment => {
          // If equipment has no open_days, assume it's available all days
          if (!equipment.open_days || equipment.open_days.length === 0) return true;
          
          // Check if the equipment is available on this weekday
          return equipment.open_days.includes(weekdayEnum);
        });

        // Find overlapping bookings (not cancelled)
        const { data: bookings, error: bookingsError } = await supabase
          .from('booking_equipment')
          .select(`
            equipment_id,
            quantity,
            start_time,
            end_time,
            status
          `)
          .not('status', 'eq', 'cancelled')
          .lte('start_time', endTime.toISOString())
          .gte('end_time', startTime.toISOString());

        if (bookingsError) throw bookingsError;

        // Extract blocked hours from bookings
        const blocked: string[] = [];
        if (bookings && bookings.length > 0) {
          bookings.forEach((booking) => {
            // Convert to local date objects
            const start = new Date(booking.start_time);
            const end = new Date(booking.end_time);
            
            // Get hours between start and end time
            const startHourLocal = start.getHours();
            const endHourLocal = end.getHours();
            
            // Add all hours in the range to blocked list
            for (let h = startHourLocal; h < endHourLocal; h++) {
              const formattedHour = `${h.toString().padStart(2, "0")}:00`;
              if (!blocked.includes(formattedHour)) {
                blocked.push(formattedHour);
              }
            }
          });
        }
        
        setBlockedHours(blocked);
        console.log("Blocked hours:", blocked);

        // Calculate availability for each equipment
        const availabilityResults = await Promise.all(openEquipment.map(equipment => {
          // Get bookings for this equipment
          const equipmentBookings = bookings?.filter(booking => 
            booking.equipment_id === equipment.id && 
            booking.status !== 'cancelled'
          ) || [];
          
          // Calculate total booked quantity
          const totalBooked = equipmentBookings.reduce((sum, booking) => sum + booking.quantity, 0);
          
          // Calculate available quantity
          const available = Math.max(0, equipment.quantity - totalBooked);
          
          return { ...equipment, available };
        }));

        // Filter to only show equipment with available quantities
        const availableItems = availabilityResults.filter(item => item.available > 0);
        
        console.log("Available equipment:", availableItems.length);
        setAvailableEquipment(availableItems);
      } catch (error) {
        console.error("Error fetching equipment availability:", error);
        setAvailableEquipment([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [startTime, endTime]);

  return { availableEquipment, blockedHours, loading };
}
