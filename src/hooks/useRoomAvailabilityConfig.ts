import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RoomAvailabilityConfig {
  minimum_interval_minutes: number;
  advance_booking_hours: number;
}

export function useRoomAvailabilityConfig(roomId: string) {
  const [config, setConfig] = useState<RoomAvailabilityConfig>({
    minimum_interval_minutes: 60,
    advance_booking_hours: 1,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!roomId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('minimum_interval_minutes, advance_booking_hours')
          .eq('id', roomId)
          .single();

        if (error) {
          console.error('Error fetching room config:', error);
          return;
        }

        if (data) {
          setConfig({
            minimum_interval_minutes: data.minimum_interval_minutes || 60,
            advance_booking_hours: data.advance_booking_hours || 1,
          });
        }
      } catch (error) {
        console.error('Error in fetchConfig:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [roomId]);

  return { config, isLoading };
}