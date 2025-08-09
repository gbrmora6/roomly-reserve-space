import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EquipmentAvailabilityConfig {
  minimum_interval_minutes: number;
  advance_booking_hours: number;
  quantity: number;
}

export function useEquipmentAvailabilityConfig(equipmentId: string) {
  const [config, setConfig] = useState<EquipmentAvailabilityConfig>({
    minimum_interval_minutes: 60,
    advance_booking_hours: 1,
    quantity: 1,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!equipmentId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('equipment')
          .select('minimum_interval_minutes, advance_booking_hours, quantity')
          .eq('id', equipmentId)
          .single();

        if (error) {
          console.error('Error fetching equipment config:', error);
          return;
        }

        if (data) {
          setConfig({
            minimum_interval_minutes: data.minimum_interval_minutes || 60,
            advance_booking_hours: data.advance_booking_hours || 1,
            quantity: data.quantity || 1,
          });
        }
      } catch (error) {
        console.error('Error in fetchConfig:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [equipmentId]);

  return { config, isLoading };
}