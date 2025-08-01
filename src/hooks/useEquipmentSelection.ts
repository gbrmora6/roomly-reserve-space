
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEquipmentAvailability } from "./useEquipmentAvailability";
import { formatDateTimeForDatabase } from "@/utils/timezone";

export function useEquipmentSelection(
  startTime: Date | null, 
  endTime: Date | null, 
  bookingId: string | null
) {
  const [selectedEquipment, setSelectedEquipment] = useState<Record<string, number>>({});
  const { availableEquipment, loading, blockedHours } = useEquipmentAvailability(startTime, endTime);
  const { toast } = useToast();
  
  useEffect(() => {
    setSelectedEquipment({});
  }, [availableEquipment]);

  const handleEquipmentChange = (equipmentId: string, quantity: number) => {
    if (quantity === 0) {
      const newSelected = { ...selectedEquipment };
      delete newSelected[equipmentId];
      setSelectedEquipment(newSelected);
    } else {
      setSelectedEquipment({ ...selectedEquipment, [equipmentId]: quantity });
    }
  };

  const handleConfirm = async () => {
    if (Object.keys(selectedEquipment).length === 0) return;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("User not authenticated");

      // Buscar o branch_id do usuário
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("branch_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const equipmentToAdd = Object.entries(selectedEquipment).map(([id, quantity]) => ({
        equipment_id: id,
        booking_id: bookingId,
        user_id: user.id,
        quantity,
        start_time: formatDateTimeForDatabase(startTime!),
        end_time: formatDateTimeForDatabase(endTime!),
        status: 'pending' as const,
        branch_id: profile.branch_id
      }));

      const { error } = await (supabase as any)
        .from('booking_equipment')
        .insert(equipmentToAdd.map(item => ({ ...item, status: 'in_process' as any })));

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Equipamentos reservados com sucesso!"
      });
      return true;
    } catch (error) {
      console.error("Erro ao reservar equipamentos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível reservar os equipamentos.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    selectedEquipment,
    availableEquipment,
    loading,
    blockedHours,
    handleEquipmentChange,
    handleConfirm
  };
}
