
import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Room } from "@/types/room";
import { toast } from "@/hooks/use-toast";
import { formatDateTimeForDatabase } from "@/utils/timezone";

export function useRoomReservation(room: Room, onClose: () => void) {
  const [loading, setLoading] = useState(false);

  const handleReserve = async (startTime: Date, endTime: Date) => {
    setLoading(true);

    const user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Usuário não autenticado."
      });
      setLoading(false);
      return null;
    }

    try {
      // Buscar o branch_id do usuário
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("branch_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      console.log("Adicionando reserva ao carrinho via RPC add_to_cart");

      // Usar a função add_to_cart que já faz toda a validação e criação da reserva temporária
      const { data: cartItem, error } = await (supabase as any).rpc("add_to_cart", {
        p_user_id: user.id,
        p_item_type: "room",
        p_item_id: room.id,
        p_quantity: 1,
        p_metadata: {
          room_name: room.name,
          start_time: formatDateTimeForDatabase(startTime),
          end_time: formatDateTimeForDatabase(endTime),
          date: format(startTime, "yyyy-MM-dd"),
          start_hour: format(startTime, "HH:mm"),
          end_hour: format(endTime, "HH:mm")
        }
      });

      if (error) {
        console.error("Erro no add_to_cart:", error);
        throw error;
      }

      console.log("Reserva adicionada ao carrinho com sucesso:", cartItem);
      
      return cartItem;
    } catch (error: any) {
      console.error("Error creating reservation:", error);
      toast({
        variant: "destructive",
        title: "Erro ao reservar",
        description: error.message || "Ocorreu um erro ao reservar a sala."
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { handleReserve, loading };
}
