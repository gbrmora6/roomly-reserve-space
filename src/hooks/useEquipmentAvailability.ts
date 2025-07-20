
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase";
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

export function useEquipmentAvailability(startTime: Date | null, endTime: Date | null) {
  const [availableEquipment, setAvailableEquipment] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    available: number;
    price_per_hour: number;
    is_active: boolean;
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
        console.log("Start time:", startTime);
        console.log("End time:", endTime);
        console.log("Weekday enum:", weekdayEnum);

        // Get all equipment
        const { data: allEquipment, error: equipmentError } = await supabase
          .from("equipment")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (equipmentError) {
          console.error("Error fetching equipment:", equipmentError);
          setLoading(false);
          return;
        }

        if (!allEquipment || allEquipment.length === 0) {
          setAvailableEquipment([]);
          setLoading(false);
          return;
        }

        // For now, assume all equipment is open (schedules will be checked via database function)
        const openEquipment = allEquipment;

        // Get equipment bookings for the selected date usando bounds locais
        const dayBounds = createDayBounds(selectedDate);

        const { data: bookings, error: bookingsError } = await supabase
          .from('booking_equipment')
          .select('equipment_id, quantity, start_time, end_time, status')
          .not('status', 'eq', 'recused')
          .gte('start_time', dayBounds.start)
          .lte('start_time', dayBounds.end);

        if (bookingsError) {
          console.error("Error fetching bookings:", bookingsError);
          setLoading(false);
          return;
        }

        console.log("Bookings found:", bookings);
        
        // Calculate availability for each equipment
        const availabilityResults = openEquipment.map(equipment => {
          // Get bookings for this equipment
          const equipmentBookings = bookings?.filter(booking => 
            booking.equipment_id === equipment.id && 
            booking.status !== 'recused'
          ) || [];
          
          // Group bookings by hour to track availability per hour
          const hourlyBookings: Record<string, number> = {};
          equipmentBookings.forEach(booking => {
            const startDate = new Date(booking.start_time);
            const endDate = new Date(booking.end_time);
            
            // For each hour in the booking, add the booked quantity
            for (let hour = startDate.getHours(); hour < endDate.getHours(); hour++) {
              const hourKey = `${hour.toString().padStart(2, "0")}:00`;
              hourlyBookings[hourKey] = (hourlyBookings[hourKey] || 0) + booking.quantity;
            }
          });

          // For equipment, we consider it available if there's at least one unit free
          const available = equipment.quantity - (equipmentBookings.length > 0 ? 
            Math.max(...Object.values(hourlyBookings)) : 0);
          
          return { 
            ...equipment, 
            available: Math.max(0, available),
            hourlyBookings
          };
        });

        // Extract blocked hours - hours where all equipment is fully booked
        const blocked: string[] = [];
        
        // Get operating hours based on equipment
        const startHour = 8; // Default open time if not specified
        const endHour = 18; // Default close time if not specified
        
        // For each hour in the operating range, check if any equipment is fully booked
        for (let hour = startHour; hour < endHour; hour++) {
          const hourKey = `${hour.toString().padStart(2, "0")}:00`;
          
          // If all equipment is fully booked for this hour, block it
          const isHourBlocked = availabilityResults.every(equip => {
            const hourlyBooked = (equip as any).hourlyBookings?.[hourKey] || 0;
            return hourlyBooked >= equip.quantity;
          });
          
          if (isHourBlocked && !blocked.includes(hourKey)) {
            blocked.push(hourKey);
          }
        }
        
        setBlockedHours(blocked);
        console.log("Blocked hours:", blocked);

        // Filter to only show equipment with available quantities
        const availableItems = availabilityResults
          .filter(item => item.available > 0)
          .map(({ hourlyBookings, ...rest }) => rest); // Remove hourlyBookings from result
        
        console.log("Available equipment:", availableItems.length);
        setAvailableEquipment(availableItems);
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

  return { availableEquipment, blockedHours, loading };
}
