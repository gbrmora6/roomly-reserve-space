
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type UserPermission = Database['public']['Tables']['user_permissions']['Row'];
type ResourceType = Database['public']['Enums']['resource_type'];
type PermissionType = Database['public']['Enums']['permission_type'];

export interface UserPermissionWithDetails extends UserPermission {
  granted_by_name?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  granted_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<UserPermissionWithDetails[]>([]);
  const [allPermissions, setAllPermissions] = useState<UserPermissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAllPermissions, setLoadingAllPermissions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email
          ),
          granted_by_profile:granted_by (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPermissions(data || []);
    } catch (err: any) {
      console.error('Error fetching permissions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPermissions = async () => {
    try {
      setLoadingAllPermissions(true);
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email
          ),
          granted_by_profile:granted_by (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllPermissions(data || []);
    } catch (err: any) {
      console.error('Error fetching all permissions:', err);
      setError(err.message);
    } finally {
      setLoadingAllPermissions(false);
    }
  };

  const hasPermission = async (
    userId: string,
    resource: ResourceType,
    permission: PermissionType,
    branchId?: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('has_permission', {
        p_user_id: userId,
        p_resource: resource,
        p_permission: permission,
        p_branch_id: branchId
      });

      if (error) throw error;
      return data || false;
    } catch (err) {
      console.error('Error checking permission:', err);
      return false;
    }
  };

  const grantPermission = async ({
    userId,
    resourceType,
    permissionType,
    branchId,
    expiresAt,
    notes
  }: {
    userId: string;
    resourceType: ResourceType;
    permissionType: PermissionType;
    branchId: string;
    expiresAt?: string;
    notes?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .insert({
          user_id: userId,
          resource_type: resourceType,
          permission_type: permissionType,
          branch_id: branchId,
          expires_at: expiresAt,
          notes: notes,
          granted_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      // Log security event
      await supabase.rpc('log_security_event', {
        p_event_type: 'permission_granted',
        p_action: 'grant_permission',
        p_details: {
          target_user_id: userId,
          resource_type: resourceType,
          permission_type: permissionType,
          branch_id: branchId
        },
        p_severity: 'warning',
        p_resource_type: 'users',
        p_resource_id: userId,
        p_risk_score: 40
      });

      await fetchPermissions();
      await fetchAllPermissions();
      return data;
    } catch (err: any) {
      console.error('Error granting permission:', err);
      throw err;
    }
  };

  const revokePermission = async (permissionId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .update({
          is_active: false,
          notes: notes
        })
        .eq('id', permissionId);

      if (error) throw error;

      // Log security event
      await supabase.rpc('log_security_event', {
        p_event_type: 'permission_revoked',
        p_action: 'revoke_permission',
        p_details: {
          permission_id: permissionId,
          notes: notes
        },
        p_severity: 'warning',
        p_resource_type: 'users',
        p_risk_score: 30
      });

      await fetchPermissions();
      await fetchAllPermissions();
    } catch (err: any) {
      console.error('Error revoking permission:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchPermissions();
    fetchAllPermissions();
  }, []);

  return {
    permissions,
    allPermissions,
    loading,
    loadingAllPermissions,
    error,
    hasPermission,
    grantPermission,
    revokePermission,
    refetch: fetchPermissions,
  };
};

export { ResourceType, PermissionType };
export default usePermissions;
