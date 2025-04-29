
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useEquipmentAvailability(startTime: Date | null, endTime: Date | null) {
  const [availableEquipment, setAvailableEquipment] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    available: number;
    price_per_hour: number;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEquipment = async () => {
      if (!startTime || !endTime) {
        setAvailableEquipment([]);
        return;
      }

      setLoading(true);

      try {
        // Get the date without time for filtering by weekday
        const selectedDate = new Date(startTime);
        selectedDate.setHours(0, 0, 0, 0);
        
        // Get weekday number (0-6, where 0 is Sunday)
        const weekdayNumber = selectedDate.getDay();
        
        console.log("Filtering equipment for date:", selectedDate);
        console.log("Start time:", startTime.toISOString());
        console.log("End time:", endTime.toISOString());
        console.log("Weekday number:", weekdayNumber);

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
          return equipment.open_days.includes(weekdayNumber);
        });

        // Find overlapping bookings (not cancelled)
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
          .lte('bookings.start_time', endTime.toISOString())
          .gte('bookings.end_time', startTime.toISOString());

        if (bookingsError) throw bookingsError;

        // Calculate availability for each equipment
        const availabilityResults = await Promise.all(openEquipment.map(equipment => {
          // Get bookings for this equipment
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

  return { availableEquipment, loading };
}
