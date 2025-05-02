
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingStatusManagerProps {
  refetch: () => Promise<any>;
}

export const BookingStatusManager = ({ refetch }: BookingStatusManagerProps) => {
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

  return { handleUpdateStatus };
}
