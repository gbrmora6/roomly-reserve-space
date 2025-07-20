import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchFilter } from "./useBranchFilter";
import { toast } from "sonner";

export type PermissionType = 'read' | 'write' | 'delete' | 'admin' | 'super_admin';
export type ResourceType = 'rooms' | 'equipment' | 'bookings' | 'clients' | 'products' | 
  'financial' | 'reports' | 'users' | 'branches' | 'coupons' | 'inventory' | 'notifications' | 'logs' | 'backups';

export interface UserPermission {
  id: string;
  user_id: string;
  resource_type: ResourceType;
  permission_type: PermissionType;
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
  branch_id: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const usePermissions = () => {
  const { user } = useAuth();
  const { branchId } = useBranchFilter();
  const queryClient = useQueryClient();

  // Verificar se usuário tem permissão específica
  const hasPermission = async (resource: ResourceType, permission: PermissionType): Promise<boolean> => {
    if (!user?.id || !branchId) return false;

    const { data, error } = await supabase.rpc('has_permission', {
      p_user_id: user.id,
      p_resource: resource,
      p_permission: permission,
      p_branch_id: branchId
    });

    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }

    return data || false;
  };

  // Buscar permissões do usuário
  const { data: userPermissions = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ['user-permissions', user?.id, branchId],
    queryFn: async () => {
      if (!user?.id || !branchId) return [];

      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserPermission[];
    },
    enabled: !!user?.id && !!branchId,
  });

  // Buscar todas as permissões (para administradores)
  const { data: allPermissions = [], isLoading: loadingAllPermissions } = useQuery({
    queryKey: ['all-permissions', branchId],
    queryFn: async () => {
      if (!branchId) return [];

      const { data, error } = await supabase
        .from('user_permissions')
        .select(`
          *,
          profiles!user_permissions_user_id_fkey(first_name, last_name, email),
          granted_by_profile:profiles!user_permissions_granted_by_fkey(first_name, last_name, email)
        `)
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  // Conceder permissão
  const grantPermissionMutation = useMutation({
    mutationFn: async (params: {
      userId: string;
      resourceType: ResourceType;
      permissionType: PermissionType;
      expiresAt?: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('user_permissions')
        .insert({
          user_id: params.userId,
          resource_type: params.resourceType,
          permission_type: params.permissionType,
          granted_by: user?.id,
          expires_at: params.expiresAt,
          notes: params.notes,
          branch_id: branchId,
        });

      if (error) throw error;

      // Log da ação
      await supabase.rpc('log_security_event', {
        p_event_type: 'permission_change',
        p_action: 'grant_permission',
        p_details: {
          target_user: params.userId,
          resource: params.resourceType,
          permission: params.permissionType,
          expires_at: params.expiresAt,
          notes: params.notes
        },
        p_severity: 'warning',
        p_resource_type: 'users',
        p_resource_id: params.userId,
        p_risk_score: 40
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['all-permissions'] });
      toast.success('Permissão concedida com sucesso');
    },
    onError: (error) => {
      console.error('Error granting permission:', error);
      toast.error('Erro ao conceder permissão');
    },
  });

  // Revogar permissão
  const revokePermissionMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase
        .from('user_permissions')
        .update({ is_active: false })
        .eq('id', permissionId);

      if (error) throw error;

      // Log da ação
      await supabase.rpc('log_security_event', {
        p_event_type: 'permission_change',
        p_action: 'revoke_permission',
        p_details: {
          permission_id: permissionId
        },
        p_severity: 'warning',
        p_resource_type: 'users',
        p_risk_score: 30
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['all-permissions'] });
      toast.success('Permissão revogada com sucesso');
    },
    onError: (error) => {
      console.error('Error revoking permission:', error);
      toast.error('Erro ao revogar permissão');
    },
  });

  return {
    hasPermission,
    userPermissions,
    allPermissions,
    loadingPermissions,
    loadingAllPermissions,
    grantPermission: grantPermissionMutation.mutate,
    revokePermission: revokePermissionMutation.mutate,
    isGranting: grantPermissionMutation.isPending,
    isRevoking: revokePermissionMutation.isPending,
  };
};