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

      console.log("Adicionando equipamento ao carrinho via inserção direta");

      // Calculate price
      const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      const totalPrice = equipment.price_per_hour * hours * quantity;

      // Get user's branch
      const { data: profile } = await supabase
        .from('profiles')
        .select('branch_id')
        .eq('id', user.id)
        .single();

      const branchId = profile?.branch_id || '';

      // Add to cart directly
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          item_type: 'equipment',
          item_id: equipmentId,
          quantity: quantity,
          price: totalPrice,
          metadata: {
            equipment_name: equipment.name,
            start_time: formatDateTimeForDatabase(startDate),
            end_time: formatDateTimeForDatabase(endDate),
            date: selectedDate.toISOString().split('T')[0],
            start_hour: startHour,
            end_hour: endHour
          },
          branch_id: branchId,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes from now
        });

      if (error) {
        console.error("Erro ao adicionar ao carrinho:", error);
        throw error;
      }

      console.log("Equipamento adicionado ao carrinho com sucesso");
      
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