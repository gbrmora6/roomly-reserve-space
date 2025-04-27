import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { BookingsTable } from "@/components/bookings/BookingsTable";
import { Database } from "@/integrations/supabase/types";
import { addHours, format } from "date-fns";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface Booking {
  id: string;
  user_id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  total_price: number;
  user: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  room: {
    name: string;
  } | null;
}

const AdminBookings: React.FC = () => {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");

  const { data: bookings = [], isLoading, refetch, isError } = useQuery<Booking[]>({
    queryKey: ["bookings", filter],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(`
          id,
          user_id,
          room_id,
          start_time,
          end_time,
          status,
          created_at,
          updated_at,
          total_price,
          user:user_id(first_name,last_name),
          room:room_id(name)
        `)
        .order("start_time", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      // Corrige horário local na exibição
      return (data as Booking[]).map((booking) => ({
        ...booking,
        start_time: addHours(new Date(booking.start_time), 3).toISOString(),
        end_time: addHours(new Date(booking.end_time), 3).toISOString(),
      }));
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao carregar reservas",
        description: err.message,
      });
    },
  });

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    try {
      if (newStatus === "cancelled") {
        const { error } = await supabase.from("bookings").delete().eq("id", id);
        if (error) throw error;
        toast({ title: "Reserva cancelada e excluída com sucesso" });
      } else {
        const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", id);
        if (error) throw error;
        toast({ title: "Reserva confirmada com sucesso" });
      }
      await refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar reserva",
        description: err.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar Reservas</h1>

      <div className="flex gap-2 mb-4">
        {(["all", "pending", "confirmed", "cancelled"] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            onClick={() => setFilter(status)}
          >
            {status === "all" && "Todas"}
            {status === "pending" && "Pendentes"}
            {status === "confirmed" && "Confirmadas"}
            {status === "cancelled" && "Canceladas"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <p>Carregando reservas...</p>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-8">
          <p>Erro ao carregar reservas.</p>
        </div>
      ) : (
        <BookingsTable bookings={bookings} onUpdateStatus={handleUpdateStatus} />
      )}
    </div>
  );
};

export default AdminBookings;
