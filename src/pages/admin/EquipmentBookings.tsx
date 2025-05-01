
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsTable } from "@/components/bookings/BookingsTable";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface EquipmentBooking {
  id: string;
  user_id: string;
  room_id: string | null;
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
  booking_equipment: {
    quantity: number;
    equipment: {
      name: string;
      price_per_hour: number;
    };
  }[] | null;
}

const AdminEquipmentBookings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BookingStatus | "all">("all");
  const { refreshUserClaims } = useAuth();
  
  // Execute refresh claims on component mount
  useEffect(() => {
    console.log("AdminEquipmentBookings component mounted, refreshing user claims");
    const refreshClaims = async () => {
      await refreshUserClaims();
    };
    refreshClaims();
  }, [refreshUserClaims]);
  
  const { data: bookings, isLoading, error, refetch } = useQuery({
    queryKey: ["equipment_bookings", activeTab],
    queryFn: async () => {
      console.log(`Fetching ${activeTab} equipment bookings`);
      try {
        let query = supabase
          .from("booking_equipment")
          .select(`
            id,
            user_id,
            booking_id,
            equipment_id,
            start_time,
            end_time,
            status,
            created_at,
            updated_at,
            total_price,
            user:profiles!booking_equipment_user_id_fkey(
              first_name,
              last_name
            ),
            equipment:equipment!booking_equipment_equipment_id_fkey(
              name,
              price_per_hour
            )
          `);
          
        if (activeTab !== "all") {
          query = query.eq("status", activeTab);
        }
        
        const { data, error } = await query.order("created_at", { ascending: false });
        
        if (error) throw error;
        
        // Transform data to match BookingsTable component expectations
        const transformedData = data.map(item => ({
          id: item.id,
          user_id: item.user_id,
          room_id: null,
          start_time: item.start_time,
          end_time: item.end_time,
          status: item.status,
          created_at: item.created_at,
          updated_at: item.updated_at,
          total_price: item.total_price,
          user: item.user,
          room: null,
          booking_equipment: [{
            quantity: 1, // Default quantity
            equipment: {
              name: item.equipment.name,
              price_per_hour: item.equipment.price_per_hour
            }
          }]
        }));
        
        return transformedData;
      } catch (error) {
        console.error("Error fetching equipment bookings:", error);
        throw error;
      }
    },
  });
  
  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    try {
      const { error } = await supabase
        .from("booking_equipment")
        .update({ status: newStatus })
        .eq("id", id);
      
      if (error) throw error;
      
      toast({
        title: "Status atualizado com sucesso",
      });
      
      refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: err.message,
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reservas de Equipamentos</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie todas as reservas de equipamentos
        </p>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as BookingStatus | "all")}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmadas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/10 p-6 text-center">
              <p className="text-destructive font-medium">Erro ao carregar reservas</p>
              <p className="text-sm text-muted-foreground mt-2">
                {(error as Error).message || "Ocorreu um erro ao carregar as reservas."}
              </p>
            </div>
          ) : (
            <BookingsTable bookings={bookings} onUpdateStatus={handleUpdateStatus} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminEquipmentBookings;
