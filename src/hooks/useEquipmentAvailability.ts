
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
        console.log("Fetching equipment availability for:", {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });

        // First get all equipment
        const { data: equipment, error: equipmentError } = await supabase
          .from("equipment")
          .select("*");

        if (equipmentError) {
          console.error("Error fetching equipment:", equipmentError);
          setLoading(false);
          return;
        }

        if (!equipment) {
          setAvailableEquipment([]);
          setLoading(false);
          return;
        }

        console.log("All equipment:", equipment);

        // Look for bookings that overlap with the requested time period
        // A booking overlaps if:
        // 1. It starts before our end time AND
        // 2. It ends after our start time
        const { data: overlappingBookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, start_time, end_time')
          .not('status', 'eq', 'cancelled')
          .lt('start_time', endTime.toISOString())
          .gt('end_time', startTime.toISOString());
        
        if (bookingsError) {
          console.error("Error fetching overlapping bookings:", bookingsError);
        }
        
        console.log("Overlapping bookings:", overlappingBookings);
        
        // Extract booking IDs into an array
        const bookingIds = overlappingBookings?.map(booking => booking.id) || [];

        const availabilityPromises = equipment.map(async (item) => {
          // If there are no overlapping bookings, all equipment is available
          if (bookingIds.length === 0) {
            console.log(`Equipment ${item.name}: No overlapping bookings, all ${item.quantity} available`);
            return {
              ...item,
              available: item.quantity
            };
          }

          // Get booked quantities for this equipment in the overlapping bookings
          const { data: bookedItems, error: bookedItemsError } = await supabase
            .from('booking_equipment')
            .select('quantity, booking_id')
            .eq('equipment_id', item.id)
            .in('booking_id', bookingIds);

          if (bookedItemsError) {
            console.error(`Error fetching booked items for equipment ${item.id}:`, bookedItemsError);
          }

          console.log(`Booked items for equipment ${item.name}:`, bookedItems);

          const totalBooked = bookedItems?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;
          const available = Math.max(0, item.quantity - totalBooked);

          console.log(`Equipment ${item.name}: total=${item.quantity}, booked=${totalBooked}, available=${available}`);

          return {
            ...item,
            available
          };
        });

        const availabilityResults = await Promise.all(availabilityPromises);
        console.log("Final availability results:", availabilityResults);
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
