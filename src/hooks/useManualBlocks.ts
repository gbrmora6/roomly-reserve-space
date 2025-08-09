import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ManualBlock {
  id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  created_by?: string;
  created_at: string;
}

export function useManualBlocks(resourceType: 'room' | 'equipment', resourceId: string) {
  const [blocks, setBlocks] = useState<ManualBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const tableName = resourceType === 'room' ? 'room_manual_blocks' : 'equipment_manual_blocks';
  const columnName = resourceType === 'room' ? 'room_id' : 'equipment_id';

  useEffect(() => {
    const fetchBlocks = async () => {
      if (!resourceId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq(columnName, resourceId)
          .order('start_time', { ascending: true });

        if (error) {
          console.error(`Error fetching ${resourceType} blocks:`, error);
          return;
        }

        setBlocks(data || []);
      } catch (error) {
        console.error(`Error in fetch${resourceType}Blocks:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlocks();
  }, [resourceId, resourceType, tableName, columnName]);

  const addBlock = async (startTime: string, endTime: string, reason?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('branch_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data, error } = await supabase
        .from(tableName)
        .insert({
          [columnName]: resourceId,
          start_time: startTime,
          end_time: endTime,
          reason,
          branch_id: profile?.branch_id,
        })
        .select()
        .single();

      if (error) {
        console.error(`Error adding ${resourceType} block:`, error);
        return false;
      }

      setBlocks(prev => [...prev, data].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ));
      return true;
    } catch (error) {
      console.error(`Error in add${resourceType}Block:`, error);
      return false;
    }
  };

  const removeBlock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', blockId);

      if (error) {
        console.error(`Error removing ${resourceType} block:`, error);
        return false;
      }

      setBlocks(prev => prev.filter(block => block.id !== blockId));
      return true;
    } catch (error) {
      console.error(`Error in remove${resourceType}Block:`, error);
      return false;
    }
  };

  return {
    blocks,
    isLoading,
    addBlock,
    removeBlock,
  };
}