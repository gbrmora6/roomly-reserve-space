
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { BookingsTable } from "@/components/bookings/BookingsTable";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const AdminBookings: React.FC = () => {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["bookings", filter],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          user:user_id(
            first_name,
            last_name
          ),
          room:room_id(
            name
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
  });

  const handleUpdateStatus = async (id: string, status: BookingStatus) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status da reserva atualizado com sucesso",
      });

      refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status da reserva",
        description: error.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar Reservas</h1>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setFilter("all")}>
            Todas
          </TabsTrigger>
          <TabsTrigger value="pending" onClick={() => setFilter("pending")}>
            Pendentes
          </TabsTrigger>
          <TabsTrigger value="confirmed" onClick={() => setFilter("confirmed")}>
            Confirmadas
          </TabsTrigger>
          <TabsTrigger value="cancelled" onClick={() => setFilter("cancelled")}>
            Canceladas
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p>Carregando reservas...</p>
          </div>
        ) : (
          <BookingsTable bookings={bookings} onUpdateStatus={handleUpdateStatus} />
        )}
      </Tabs>
    </div>
  );
};

export default AdminBookings;
