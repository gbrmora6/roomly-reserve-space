
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { BookingsTable } from "@/components/bookings/BookingsTable";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

// Define a type for the booking data returned from Supabase
interface BookingData {
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
      
      // Process the data to handle error objects in foreign key relationships
      const processedData = data?.map(item => ({
        ...item,
        user: typeof item.user === 'object' && item.user !== null ? item.user : null,
        room: typeof item.room === 'object' && item.room !== null ? item.room : null
      }));

      return processedData as BookingData[];
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
