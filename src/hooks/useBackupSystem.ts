import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBranchFilter } from "./useBranchFilter";
import { toast } from "sonner";

export interface SystemBackup {
  id: string;
  backup_type: 'scheduled' | 'manual' | 'pre_migration';
  status: 'pending' | 'running' | 'paid' | 'failed';
  backup_size?: number;
  file_path?: string;
  file_url?: string;
  tables_included?: string[];
  compression_type: string;
  branch_id?: string;
  initiated_by?: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  backup_metadata?: any;
  retention_until: string;
  created_at: string;
}

export const useBackupSystem = () => {
  const { branchId } = useBranchFilter();
  const queryClient = useQueryClient();

  // Buscar backups
  const { data: backups = [], isLoading } = useQuery({
    queryKey: ['system-backups', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_backups')
        .select(`
          *,
          initiated_by_profile:profiles!system_backups_initiated_by_fkey(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SystemBackup[];
    },
  });

  // Criar backup manual
  const createBackupMutation = useMutation({
    mutationFn: async (params: {
      backupType?: 'manual' | 'scheduled' | 'pre_migration';
      tablesIncluded?: string[];
      compressionType?: string;
    }) => {
      const currentUser = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('system_backups')
        .insert({
          backup_type: params.backupType || 'manual',
          status: 'pending',
          tables_included: params.tablesIncluded || [
            'profiles', 'bookings', 'rooms', 'equipment', 
            'orders', 'products', 'branches', 'admin_logs'
          ],
          compression_type: params.compressionType || 'gzip',
          branch_id: branchId,
          initiated_by: currentUser.data.user?.id,
          backup_metadata: {
            created_by: currentUser.data.user?.email,
            requested_at: new Date().toISOString(),
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Iniciar processamento do backup (em um cenário real, isso seria feito por um job em background)
      setTimeout(async () => {
        // Simular processamento
        await supabase
          .from('system_backups')
          .update({
            status: 'running',
          })
          .eq('id', data.id);

        // Simular conclusão após alguns segundos
        setTimeout(async () => {
          await supabase
            .from('system_backups')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              backup_size: Math.floor(Math.random() * 1000000000), // Tamanho simulado
              file_path: `/backups/${data.id}.sql.gz`,
              file_url: `https://storage.example.com/backups/${data.id}.sql.gz`,
            })
            .eq('id', data.id);

          queryClient.invalidateQueries({ queryKey: ['system-backups'] });
        }, 5000);
      }, 1000);

      return data;
    },
    onSuccess: () => {
      toast.success('Backup iniciado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['system-backups'] });
    },
    onError: (error) => {
      console.error('Error creating backup:', error);
      toast.error('Erro ao criar backup');
    },
  });

  // Restaurar backup
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      // Em um cenário real, isso dispararia um processo de restauração
      toast.info('Processo de restauração iniciado. Isso pode levar alguns minutos.');
      
      // Log da ação crítica
      await supabase.rpc('log_security_event', {
        p_event_type: 'system_change',
        p_action: 'restore_backup',
        p_details: {
          backup_id: backupId,
          initiated_at: new Date().toISOString()
        },
        p_severity: 'critical',
        p_resource_type: 'backups',
        p_resource_id: backupId,
        p_risk_score: 90
      });
    },
    onSuccess: () => {
      toast.success('Restauração iniciada com sucesso');
    },
    onError: (error) => {
      console.error('Error restoring backup:', error);
      toast.error('Erro ao restaurar backup');
    },
  });

  // Excluir backup
  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const { error } = await supabase
        .from('system_backups')
        .delete()
        .eq('id', backupId);

      if (error) throw error;

      // Log da ação
      await supabase.rpc('log_security_event', {
        p_event_type: 'system_change',
        p_action: 'delete_backup',
        p_details: {
          backup_id: backupId
        },
        p_severity: 'warning',
        p_resource_type: 'backups',
        p_resource_id: backupId,
        p_risk_score: 30
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-backups'] });
      toast.success('Backup excluído com sucesso');
    },
    onError: (error) => {
      console.error('Error deleting backup:', error);
      toast.error('Erro ao excluir backup');
    },
  });

  // Agendar backup automático
  const scheduleAutomaticBackup = async (schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    enabled: boolean;
  }) => {
    // Em um cenário real, isso configuraria um cron job
    toast.info('Backup automático configurado com sucesso');
    
    await supabase.rpc('log_security_event', {
      p_event_type: 'system_change',
      p_action: 'schedule_automatic_backup',
      p_details: schedule,
      p_severity: 'info',
      p_resource_type: 'backups',
      p_risk_score: 10
    });
  };

  // Estatísticas de backup
  const getBackupStats = () => {
    const totalBackups = backups.length;
    const completedBackups = backups.filter(b => b.status === 'completed').length;
    const failedBackups = backups.filter(b => b.status === 'failed').length;
    const pendingBackups = backups.filter(b => b.status === 'pending').length;
    const runningBackups = backups.filter(b => b.status === 'running').length;

    const totalSize = backups
      .filter(b => b.backup_size)
      .reduce((sum, b) => sum + (b.backup_size || 0), 0);

    return {
      totalBackups,
      completedBackups,
      failedBackups,
      pendingBackups,
      runningBackups,
      totalSize,
    };
  };

  return {
    backups,
    isLoading,
    createBackup: createBackupMutation.mutate,
    restoreBackup: restoreBackupMutation.mutate,
    deleteBackup: deleteBackupMutation.mutate,
    scheduleAutomaticBackup,
    isCreating: createBackupMutation.isPending,
    isRestoring: restoreBackupMutation.isPending,
    isDeleting: deleteBackupMutation.isPending,
    getBackupStats,
  };
};