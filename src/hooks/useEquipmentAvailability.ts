
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useEquipmentAvailability(startTime: Date | null, endTime: Date | null) {
  const [availableEquipment, setAvailableEquipment] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    available: number;
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
          .select("*");

        if (equipmentError) throw equipmentError;

        if (!equipment || equipment.length === 0) {
          setAvailableEquipment([]);
          return;
        }

        // Find overlapping bookings (not cancelled)
        const { data: overlappingBookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id')
          .not('status', 'eq', 'cancelled')
          .lt('start_time', endTime.toISOString())
          .gt('end_time', startTime.toISOString());

        if (bookingsError) throw bookingsError;

        const bookingIds = overlappingBookings?.map(booking => booking.id) || [];

        // For each equipment, calculate availability
        const availabilityResults = await Promise.all(equipment.map(async (item) => {
          // Default: all equipment is available if no overlapping bookings
          if (bookingIds.length === 0) {
            return { ...item, available: item.quantity };
          }

          // Get equipment quantities booked in overlapping bookings
          const { data: bookedItems, error: bookedItemsError } = await supabase
            .from('booking_equipment')
            .select('booking_id, quantity')
            .eq('equipment_id', item.id)
            .in('booking_id', bookingIds);

          if (bookedItemsError) throw bookedItemsError;

          // Sum all booked quantities
          const totalBooked = bookedItems?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;
          
          // Calculate available (never less than 0)
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
