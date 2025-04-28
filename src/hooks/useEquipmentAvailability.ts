
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
        // Fetch all equipment
        const { data: equipment, error: equipmentError } = await supabase
          .from("equipment")
          .select("*")
          .order("name");

        if (equipmentError) throw equipmentError;

        if (!equipment || equipment.length === 0) {
          setAvailableEquipment([]);
          return;
        }

        // Get weekday from startTime as lowercase string: 'monday', 'tuesday', etc.
        const weekday = startTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as 
          'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
        
        // Filter equipment based on open days and hours
        const filteredEquipment = equipment.filter(item => {
          // Check if weekday is in open_days
          if (!item.open_days?.includes(weekday)) return false;
          
          // Convert time strings to Date objects for comparison
          const startHour = startTime.getHours();
          const endHour = endTime.getHours();
          
          if (!item.open_time || !item.close_time) return true;
          
          const [openHour] = item.open_time.split(':').map(Number);
          const [closeHour] = item.close_time.split(':').map(Number);
          
          return startHour >= openHour && endHour <= closeHour;
        });

        // Find overlapping bookings (not cancelled)
        const { data: overlappingBookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id')
          .not('status', 'eq', 'cancelled')
          .lt('start_time', endTime.toISOString())
          .gt('end_time', startTime.toISOString());

        if (bookingsError) throw bookingsError;

        const bookingIds = overlappingBookings?.map(booking => booking.id) || [];

        // Calculate availability for each equipment
        const availabilityResults = await Promise.all(filteredEquipment.map(async (item) => {
          if (bookingIds.length === 0) {
            return { ...item, available: item.quantity };
          }

          const { data: bookedItems, error: bookedItemsError } = await supabase
            .from('booking_equipment')
            .select('booking_id, quantity')
            .eq('equipment_id', item.id)
            .in('booking_id', bookingIds);

          if (bookedItemsError) throw bookedItemsError;

          const totalBooked = bookedItems?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;
          const available = Math.max(0, item.quantity - totalBooked);

          return { ...item, available };
        }));

        setAvailableEquipment(availabilityResults);
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
