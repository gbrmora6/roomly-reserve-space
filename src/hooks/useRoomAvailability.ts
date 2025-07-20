
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRoomAvailability = (roomId: string, selectedDate: Date | undefined) => {
  return useQuery({
    queryKey: ['room-availability', roomId, selectedDate?.toDateString()],
    queryFn: async () => {
      if (!roomId || !selectedDate) return [];

      const dateString = selectedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase.rpc('get_room_availability', {
        p_room_id: roomId,
        p_date: dateString
      });

      if (error) {
        console.error('Error fetching room availability:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!roomId && !!selectedDate,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 5, // 5 minutes
  });
};
