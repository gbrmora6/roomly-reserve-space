
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
        const { data: equipment } = await supabase
          .from("equipment")
          .select("*");

        if (!equipment) {
          setAvailableEquipment([]);
          setLoading(false);
          return;
        }

        // First, get overlapping bookings for this time period
        const { data: overlappingBookings } = await supabase
          .from('bookings')
          .select('id')
          .not('status', 'eq', 'cancelled')
          .gte('end_time', startTime.toISOString())
          .lte('start_time', endTime.toISOString());
        
        // Extract booking IDs into an array
        const bookingIds = overlappingBookings?.map(booking => booking.id) || [];

        const availabilityPromises = equipment.map(async (item) => {
          // If there are no overlapping bookings, all equipment is available
          if (bookingIds.length === 0) {
            return {
              ...item,
              available: item.quantity
            };
          }

          // Get booked quantities for this equipment in the overlapping bookings
          const { data: bookedQuantity } = await supabase
            .from('booking_equipment')
            .select('quantity')
            .eq('equipment_id', item.id)
            .in('booking_id', bookingIds);

          const totalBooked = bookedQuantity?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;
          const available = Math.max(0, item.quantity - totalBooked);

          return {
            ...item,
            available
          };
        });

        const availabilityResults = await Promise.all(availabilityPromises);
        setAvailableEquipment(availabilityResults);
      } catch (error) {
        console.error("Erro ao buscar disponibilidade dos equipamentos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [startTime, endTime]);

  return { availableEquipment, loading };
}
