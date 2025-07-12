
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
      // Buscar o branch_id do usuário
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("branch_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // Create date objects for start and end times usando função local
      const startDate = createLocalDateTime(selectedDate, startHour);
      const endDate = createLocalDateTime(selectedDate, endHour);

      // Create equipment booking with booking_id set to null explicitly
      const { error: equipmentError } = await supabase
        .from("booking_equipment")
        .insert({
          equipment_id: equipmentId,
          quantity: quantity,
          user_id: user.id,
          start_time: formatDateTimeForDatabase(startDate),
          end_time: formatDateTimeForDatabase(endDate),
          status: "pending",
          booking_id: null,
          branch_id: profile.branch_id
        });

      if (equipmentError) throw equipmentError;

      toast.success("Reserva realizada com sucesso!");
      onSuccess();
    } catch (error: any) {
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
