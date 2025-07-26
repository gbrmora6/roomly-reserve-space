
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
        .select(`
          *, 
          room:rooms(name, description),
          payment_details:payment_details(*),
          orders!left(id, payment_method, payment_data)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((booking: any) => ({
        ...booking,
        payment_method: booking.orders?.[0]?.payment_method,
        payment_data: booking.orders?.[0]?.payment_data,
      }));
    },
    enabled: !!userId,
  });

  const { data: equipmentBookings = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ["my-equipment-bookings", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("booking_equipment")
        .select(`
          *, 
          equipment:equipment(name, description),
          payment_details:payment_details(*),
          orders!left(id, payment_method, payment_data)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((booking: any) => ({
        ...booking,
        payment_method: booking.orders?.[0]?.payment_method,
        payment_data: booking.orders?.[0]?.payment_data,
      }));
    },
    enabled: !!userId,
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async ({ bookingId, type }: { bookingId: string; type: "room" | "equipment" }) => {
      const table = type === "room" ? "bookings" : "booking_equipment";
      const { error } = await supabase
        .from(table)
        .update({ status: "recused" })
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

  const checkPaymentStatusMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.functions.invoke('payment-status', {
        body: { bookingId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["my-equipment-bookings"] });
      toast({
        title: "Status atualizado",
        description: "O status do pagamento foi verificado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao verificar status",
        description: error.message || "Ocorreu um erro ao verificar o status do pagamento.",
      });
    },
  });

  const requestRefundMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason?: string }) => {
      // Buscar a order relacionada ao booking através dos dados já carregados
      const allBookings = [...roomBookings, ...equipmentBookings];
      const booking = allBookings.find(b => b.id === bookingId);
      
      if (!booking || !booking.orders?.[0]?.id) {
        throw new Error("Não foi possível encontrar a ordem relacionada ao booking");
      }

      const { data, error } = await supabase.functions.invoke('payment-refund', {
        body: { orderId: booking.orders[0].id, reason }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["my-equipment-bookings"] });
      toast({
        title: "Estorno solicitado",
        description: "Sua solicitação de estorno foi enviada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao solicitar estorno",
        description: error.message || "Ocorreu um erro ao solicitar o estorno.",
      });
    },
  });

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
    checkPaymentStatus: checkPaymentStatusMutation,
    requestRefund: requestRefundMutation,
  };
};
