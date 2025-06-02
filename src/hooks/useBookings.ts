
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type BookingTab = "rooms" | "equipment" | "products";

export const useBookings = (userId: string | undefined) => {
  const [activeTab, setActiveTab] = useState<BookingTab>("rooms");
  const queryClient = useQueryClient();

  const { data: roomBookings = [], isLoading: roomLoading } = useQuery({
    queryKey: ["my-bookings", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`*, room:rooms(name, description)`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: equipmentBookings = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ["my-equipment-bookings", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("booking_equipment")
        .select(`*, equipment:equipment(name, description)`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async ({ bookingId, type }: { bookingId: string; type: "room" | "equipment" }) => {
      const table = type === "room" ? "bookings" : "booking_equipment";
      const { error } = await supabase
        .from(table)
        .update({ status: "cancelled" })
        .eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["my-equipment-bookings"] });
      toast({
        title: "Reserva cancelada",
        description: "Sua reserva foi cancelada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao cancelar reserva",
        description: error.message || "Ocorreu um erro ao cancelar a reserva.",
      });
    },
  });

  const handleCancelBooking = (bookingId: string, type: "room" | "equipment") => {
    if (window.confirm("Tem certeza que deseja cancelar esta reserva?")) {
      cancelBookingMutation.mutate({ bookingId, type });
    }
  };

  const handleTabChange = (tab: BookingTab) => {
    setActiveTab(tab);
  };

  return {
    roomBookings,
    equipmentBookings,
    isLoading: roomLoading || equipmentLoading,
    activeTab,
    setActiveTab: handleTabChange,
    handleCancelBooking,
  };
};
