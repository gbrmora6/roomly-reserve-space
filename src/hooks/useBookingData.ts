import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingFilter {
  status?: BookingStatus | "all";
  branchId?: string;
}

export function useBookingData(initialFilter: BookingFilter = { status: "all", branchId: undefined }) {
  const [filter, setFilter] = useState<BookingFilter>(initialFilter);
  const { toast } = useToast();

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["bookings", filter],
    queryFn: async () => {
      try {
        let query = supabase
          .from("bookings")
          .select(`
            *,
            room:rooms(
              name,
              price_per_hour
            ),
            booking_equipment:booking_equipment(
              quantity,
              equipment:equipment(
                name,
                price_per_hour
              )
            )
          `)
          .order("start_time", { ascending: false });

        if (filter.status && filter.status !== "all") {
          query = query.eq("status", filter.status);
        }
        if (filter.branchId) {
          query = query.eq("branch_id", filter.branchId);
        }

        const { data: bookingData, error } = await query;

        if (error) throw error;
        if (!bookingData) return [];

        // For each booking, fetch the user profile information separately
        const bookingsWithProfiles = await Promise.all(
          bookingData.map(async (booking) => {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("first_name, last_name")
                .eq("id", booking.user_id)
                .maybeSingle();
              return {
                ...booking,
                user: profileError || !profileData
                  ? { first_name: 'Usuário', last_name: 'Desconhecido' }
                  : profileData,
                booking_equipment: booking.booking_equipment || []
              };
            } catch (err) {
              console.error("Error fetching profile for booking:", err);
              return {
                ...booking,
                user: { first_name: 'Usuário', last_name: 'Desconhecido' },
                booking_equipment: booking.booking_equipment || []
              };
            }
          })
        );
        return bookingsWithProfiles;
      } catch (error: any) {
        console.error("Erro ao buscar reservas:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar reservas",
          description: error.message,
        });
        return [];
      }
    },
    meta: {
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Erro ao carregar reservas",
          description: err.message,
        });
      }
    },
  });

  return { bookings: bookings || [], isLoading, refetch, filter, setFilter };
}
