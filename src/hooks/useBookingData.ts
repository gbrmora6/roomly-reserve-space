
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

export function useBookingData(initialFilter: BookingStatus | "all" = "all") {
  const [filter, setFilter] = useState<BookingStatus | "all">(initialFilter);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["bookings", filter],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          room:rooms(
            name,
            price_per_hour
          ),
          user:profiles(first_name, last_name),
          booking_equipment:booking_equipment(
            quantity,
            equipment:equipment(
              name,
              price_per_hour
            )
          )
        `)
        .order("start_time", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
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

  return { bookings, isLoading, refetch, filter, setFilter };
}
