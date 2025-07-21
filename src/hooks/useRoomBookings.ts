
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface UseRoomBookingsProps {
  branchId: string;
}

export const useRoomBookings = ({ branchId }: UseRoomBookingsProps) => {
  // Valid booking statuses from the enum
  const validStatuses: BookingStatus[] = ['in_process', 'paid', 'partial_refunded', 'cancelled', 'pre_authorized', 'recused'];

  const getBookingsByStatus = (status: BookingStatus) => {
    return useQuery({
      queryKey: ["room-bookings", branchId, status],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("bookings")
          .select(`
            *,
            room:rooms(name, description),
            payment_details:payment_details(*),
            orders!left(id, payment_method, payment_data)
          `)
          .eq("branch_id", branchId)
          .eq("status", status)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(`Error fetching ${status} room bookings:`, error);
          throw error;
        }

        return data || [];
      },
      enabled: !!branchId,
    });
  };

  // Using valid enum values
  const inProcessBookings = getBookingsByStatus('in_process');
  const paidBookings = getBookingsByStatus('paid');
  const cancelledBookings = getBookingsByStatus('cancelled');

  return {
    inProcessBookings,
    paidBookings,
    cancelledBookings,
    isLoading: inProcessBookings.isLoading || paidBookings.isLoading || cancelledBookings.isLoading,
    error: inProcessBookings.error || paidBookings.error || cancelledBookings.error,
  };
};
