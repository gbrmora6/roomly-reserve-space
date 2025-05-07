
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
      
      // First check if user is one of the superadmins by email
      const userEmail = session.user.email;
      const isSuperAdmin = 
        userEmail === "admin@example.com" || 
        userEmail === "cpd@sapiens-psi.com.br";
      
      // Force admin status for superadmins
      if (isSuperAdmin) {
        devLog("SuperAdmin detected by email, setting admin privileges");
        
        const { data, error: updateError } = await supabase.auth.updateUser({
          data: { 
            role: "admin",
            is_admin: true,
            is_super_admin: true
          }
        });
        
        if (updateError) {
          errorLog("Error updating superadmin claims", updateError);
          return;
        }
        
        if (data?.user) {
          devLog("SuperAdmin claims updated successfully", data.user.user_metadata);
          
          // Refresh session to update JWT claims
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            errorLog("Error refreshing session after superadmin claims update", refreshError);
          } else {
            devLog("Session refreshed with new superadmin JWT claims");
            // Store encrypted timestamp of last refresh
            localStorage.setItem('last_claims_refresh', encryptData(now.toString()));
          }
        }
        
        return;
      }
      
      // For regular users, check if we need to update based on profile
      devLog("Current user metadata", session.user.user_metadata);
      
      // Fetch profile data to verify role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        errorLog("Error fetching user profile for claims refresh", profileError);
        return;
      }
      
      if (!profile?.role) {
        devLog("No role found in profile data, skipping claims update");
        return;
      }

      // Check if user role has changed or admin status needs updating
      const currentRole = session.user.user_metadata?.role;
      const isAdmin = profile.role === 'admin';
      const currentIsAdmin = session.user.user_metadata?.is_admin === true;
      const currentIsSuperAdmin = session.user.user_metadata?.is_super_admin === true;
      
      // Only update if there's a mismatch
      if (currentRole === profile.role && currentIsAdmin === isAdmin && currentIsSuperAdmin === isSuperAdmin) {
        devLog("User claims already up to date, skipping update");
        // Still update the refresh timestamp
        localStorage.setItem('last_claims_refresh', encryptData(now.toString()));
        return;
      }

      devLog("Updating user JWT claims to match profile role", {
        role: profile.role,
        is_admin: isAdmin,
        is_super_admin: isSuperAdmin
      });
      
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { 
          role: profile.role,
          is_admin: isAdmin,
          is_super_admin: isSuperAdmin
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
