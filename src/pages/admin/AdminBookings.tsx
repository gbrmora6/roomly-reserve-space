import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookingsTable } from "@/components/bookings/BookingsTable";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const AdminBookings = () => {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");

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

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    try {
      if (newStatus === "cancelled") {
        // First remove any equipment bookings
        const { error: equipmentError } = await supabase
          .from("booking_equipment")
          .delete()
          .eq("booking_id", id);
          
        if (equipmentError) {
          throw equipmentError;
        }
        
        // Then update the booking status
        const { error } = await supabase
          .from("bookings")
          .update({ status: newStatus })
          .eq("id", id);
          
        if (error) throw error;
        
        toast({ title: "Reserva cancelada com sucesso" });
      } else {
        const { error } = await supabase
          .from("bookings")
          .update({ status: newStatus })
          .eq("id", id);
          
        if (error) throw error;
        toast({ title: "Status da reserva atualizado com sucesso" });
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

      <BookingsTable bookings={bookings} onUpdateStatus={handleUpdateStatus} />
    </div>
  );
};

export default AdminBookings;
