import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBranchFilter } from "./useBranchFilter";

export interface ChangeHistoryRecord {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data?: any;
  new_data?: any;
  changed_fields?: string[];
  user_id?: string;
  user_email?: string;
  user_role?: string;
  ip_address?: string;
  user_agent?: string;
  branch_id: string;
  created_at: string;
}

export const useChangeHistory = (tableName?: string, recordId?: string) => {
  const { branchId } = useBranchFilter();

  // Buscar histórico de alterações
  const { data: changeHistory = [], isLoading } = useQuery({
    queryKey: ['change-history', branchId, tableName, recordId],
    queryFn: async () => {
      if (!branchId) return [];

      let query = supabase
        .from('change_history')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (tableName) {
        query = query.eq('table_name', tableName);
      }

      if (recordId) {
        query = query.eq('record_id', recordId);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return data as ChangeHistoryRecord[];
    },
    enabled: !!branchId,
  });

  // Buscar alterações por usuário
  const getChangesByUser = (userId: string) => {
    return changeHistory.filter(change => change.user_id === userId);
  };

  // Buscar alterações por tabela
  const getChangesByTable = (table: string) => {
    return changeHistory.filter(change => change.table_name === table);
  };

  // Buscar alterações por período
  const getChangesByDateRange = (startDate: Date, endDate: Date) => {
    return changeHistory.filter(change => {
      const changeDate = new Date(change.created_at);
      return changeDate >= startDate && changeDate <= endDate;
    });
  };

  // Comparar versões de um registro
  const compareVersions = (recordId: string) => {
    const recordChanges = changeHistory.filter(change => change.record_id === recordId);
    return recordChanges.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  // Estatísticas de alterações
  const getChangeStats = () => {
    const totalChanges = changeHistory.length;
    const insertions = changeHistory.filter(c => c.operation === 'INSERT').length;
    const updates = changeHistory.filter(c => c.operation === 'UPDATE').length;
    const deletions = changeHistory.filter(c => c.operation === 'DELETE').length;

    const changesByTable = changeHistory.reduce((acc, change) => {
      acc[change.table_name] = (acc[change.table_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const changesByUser = changeHistory.reduce((acc, change) => {
      if (change.user_email) {
        acc[change.user_email] = (acc[change.user_email] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      totalChanges,
      insertions,
      updates,
      deletions,
      changesByTable,
      changesByUser,
    };
  };

  return {
    changeHistory,
    isLoading,
    getChangesByUser,
    getChangesByTable,
    getChangesByDateRange,
    compareVersions,
    getChangeStats,
  };
};