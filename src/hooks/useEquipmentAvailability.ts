
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
        const { data: equipment, error: equipmentError } = await supabase
          .from("equipment")
          .select("*");

        if (equipmentError) throw equipmentError;

        if (!equipment) {
          setAvailableEquipment([]);
          return;
        }

        const { data: overlappingBookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id')
          .not('status', 'eq', 'cancelled')
          .lt('start_time', endTime.toISOString())
          .gt('end_time', startTime.toISOString());

        if (bookingsError) throw bookingsError;

        const bookingIds = overlappingBookings?.map(booking => booking.id) || [];

        const availabilityPromises = equipment.map(async (item) => {
          if (bookingIds.length === 0) {
            return { ...item, available: item.quantity };
          }

          const { data: bookedItems, error: bookedItemsError } = await supabase
            .from('booking_equipment')
            .select('quantity')
            .eq('equipment_id', item.id)
            .in('booking_id', bookingIds);

          if (bookedItemsError) throw bookedItemsError;

          const totalBooked = bookedItems?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;
          const available = Math.max(0, item.quantity - totalBooked);

          return { ...item, available };
        });

        const availabilityResults = await Promise.all(availabilityPromises);
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
