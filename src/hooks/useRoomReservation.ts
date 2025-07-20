
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useRoomReservation = () => {
  const queryClient = useQueryClient();

  const reserveRoom = useMutation({
    mutationFn: async (reservationData: {
      roomId: string;
      startTime: string;
      endTime: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('add_to_cart', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id || '',
        p_item_type: 'room',
        p_item_id: reservationData.roomId,
        p_quantity: 1,
        p_metadata: {
          start_time: reservationData.startTime,
          end_time: reservationData.endTime,
          notes: reservationData.notes || ''
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['room-availability'] });
      toast.success('Sala adicionada ao carrinho com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error reserving room:', error);
      toast.error(error.message || 'Erro ao reservar sala');
    },
  });

  return {
    reserveRoom: reserveRoom.mutate,
    isReserving: reserveRoom.isPending,
  };
};
