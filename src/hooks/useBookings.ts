
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

export const useBookings = (userId: string | undefined) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"rooms" | "equipment">("rooms");
  const queryClient = useQueryClient();

  // Fetch room bookings
  const { 
    data: roomBookings, 
    isLoading: roomsLoading, 
    refetch: refetchRooms 
  } = useQuery({
    queryKey: ["my-room-bookings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
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
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch equipment bookings
  const { 
    data: equipmentBookings, 
    isLoading: equipmentLoading, 
    refetch: refetchEquipment 
  } = useQuery({
    queryKey: ["my-equipment-bookings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_equipment")
        .select(`
          id,
          booking_id,
          equipment_id,
          quantity,
          start_time,
          end_time,
          status,
          created_at,
          updated_at,
          total_price,
          user_id,
          equipment:equipment(
            name,
            price_per_hour
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform data to match BookingsTable component expectations
      const transformedData = data.map(item => ({
        id: item.id,
        user_id: item.user_id,
        room_id: null,
        start_time: item.start_time,
        end_time: item.end_time,
        status: item.status as BookingStatus,
        created_at: item.created_at,
        updated_at: item.updated_at,
        total_price: item.total_price,
        user: null,
        room: null,
        booking_equipment: [{
          quantity: item.quantity,
          equipment: {
            name: item.equipment.name,
            price_per_hour: item.equipment.price_per_hour
          }
        }]
      }));
      
      return transformedData;
    },
    enabled: !!userId,
  });

  // Handle cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    try {
      if (activeTab === "rooms") {
        const { error } = await supabase
          .from("bookings")
          .update({ status: "cancelled" })
          .eq("id", bookingId);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Reserva de sala cancelada com sucesso.",
        });
        
        // Invalidate related queries to update notifications immediately
        queryClient.invalidateQueries({ queryKey: ["pending-room-bookings"] });
        
        refetchRooms();
      } else {
        const { error } = await supabase
          .from("booking_equipment")
          .update({ status: "cancelled" })
          .eq("id", bookingId);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Reserva de equipamento cancelada com sucesso.",
        });
        
        // Invalidate related queries to update notifications immediately
        queryClient.invalidateQueries({ queryKey: ["pending-equipment-bookings"] });
        
        refetchEquipment();
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a reserva: " + error.message,
        variant: "destructive",
      });
    }
  };

  const isLoading = roomsLoading || equipmentLoading;

  return {
    roomBookings,
    equipmentBookings,
    isLoading,
    activeTab,
    setActiveTab,
    handleCancelBooking,
  };
};
