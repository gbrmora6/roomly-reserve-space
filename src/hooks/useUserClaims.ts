import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { encryptData, decryptData } from "@/utils/encryption";
import { devLog, errorLog } from "@/utils/logger";

export function useUserClaims() {
  const refreshUserClaims = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        devLog("No active session found, skipping claims refresh");
        return;
      }
      
      // Check if we have a cached timestamp to prevent too frequent refreshes
      const lastRefreshStr = localStorage.getItem('last_claims_refresh');
      const lastRefresh = lastRefreshStr ? parseInt(decryptData(lastRefreshStr)) : 0;
      const now = Date.now();
      
      // Don't refresh claims more than once every 60 seconds unless forced
      if (lastRefresh && (now - lastRefresh < 60000)) {
        devLog("Claims were refreshed recently, skipping refresh");
        return;
      }
      
      // Fetch profile data to verify role e branch_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        errorLog("Error fetching user profile for claims refresh", profileError);
        return;
      }
      
      if (!profile?.role || !profile?.branch_id) {
        devLog("No role or branch_id found in profile data, skipping claims update");
        return;
      }

      // Check if user role or branch_id has changed
      const currentRole = session.user.user_metadata?.role;
      const currentBranchId = session.user.user_metadata?.branch_id;
      const isAdmin = profile.role === 'admin';
      
      if (currentRole === profile.role && currentBranchId === profile.branch_id) {
        devLog("User claims already up to date, skipping update");
        localStorage.setItem('last_claims_refresh', encryptData(now.toString()));
        return;
      }

      devLog("Updating user JWT claims to match profile role and branch_id", {
        role: profile.role,
        branch_id: profile.branch_id
      });
      
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: {
          role: profile.role,
          branch_id: profile.branch_id
        }
      });
      
      if (updateError) {
        errorLog("Error updating user claims", updateError);
        toast({
          variant: "destructive",
          title: "Erro de autenticação",
          description: "Não foi possível atualizar suas permissões. Por favor, tente novamente.",
        });
        return;
      }
      
      if (data?.user) {
        devLog("User claims updated successfully", data.user.user_metadata);
        
        // Refresh session to update JWT claims
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          errorLog("Error refreshing session after claims update", refreshError);
        } else {
          devLog("Session refreshed with new JWT claims");
          localStorage.setItem('last_claims_refresh', encryptData(now.toString()));
        }
      }
    } catch (err) {
      errorLog("Error in refreshUserClaims", err);
    }
  }, []);

  return { refreshUserClaims };
}
