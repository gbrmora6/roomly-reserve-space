
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTimeForDatabase, createLocalDateTime } from "@/utils/timezone";

interface UseEquipmentBookingSubmitProps {
  equipmentId: string;
  selectedDate: Date | null;
  startHour: string;
  endHour: string;
  quantity: number;
  onSuccess: () => void;
}

export function useEquipmentBookingSubmit({
  equipmentId,
  selectedDate,
  startHour,
  endHour,
  quantity,
  onSuccess
}: UseEquipmentBookingSubmitProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para fazer uma reserva");
      return;
    }

    if (!selectedDate || !startHour || !endHour) {
      toast.error("Por favor, selecione data e horários");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create date objects for start and end times using local timezone
      const startDate = createLocalDateTime(selectedDate, startHour);
      const endDate = createLocalDateTime(selectedDate, endHour);

      // Get equipment details for price calculation
      const { data: equipment, error: equipmentError } = await supabase
        .from("equipment")
        .select("name, price_per_hour")
        .eq("id", equipmentId)
        .single();

      if (equipmentError) throw equipmentError;

      console.log("Adicionando equipamento ao carrinho via RPC add_to_cart");

      // Use add_to_cart function that handles all validation and creates temporary reservation
      const { data: cartItem, error } = await (supabase as any).rpc("add_to_cart", {
        p_user_id: user.id,
        p_item_type: "equipment",
        p_item_id: equipmentId,
        p_quantity: quantity,
        p_metadata: {
          equipment_name: equipment.name,
          start_time: formatDateTimeForDatabase(startDate),
          end_time: formatDateTimeForDatabase(endDate),
          date: selectedDate.toISOString().split('T')[0], // Use ISO date format for metadata
          start_hour: startHour,
          end_hour: endHour
        }
      });

      if (error) {
        console.error("Erro no add_to_cart:", error);
        throw error;
      }

      console.log("Equipamento adicionado ao carrinho com sucesso:", cartItem);
      
      toast.success("Equipamento adicionado ao carrinho!");
      onSuccess();
    } catch (error: any) {
      console.error("Error adding equipment to cart:", error);
      toast.error(`Erro ao fazer reserva: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    handleSubmit
  };
}
