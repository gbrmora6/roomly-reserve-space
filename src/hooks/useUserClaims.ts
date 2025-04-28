
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUserClaims() {
  const refreshUserClaims = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      console.log("Refreshing user claims");
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error("Error fetching user profile for claims refresh:", profileError);
        return;
      }
      
      console.log("Profile data from database:", profile);
      
      if (profile?.role) {
        // Update user metadata with both role and is_admin flag for RLS policies
        const isAdmin = profile.role === 'admin';
        
        const { data, error: updateError } = await supabase.auth.updateUser({
          data: { 
            role: profile.role,
            is_admin: isAdmin  // Add is_admin flag for RLS policies
          }
        });
        
        if (updateError) {
          console.error("Error updating user claims:", updateError);
          return;
        }
        
        if (data?.user) {
          console.log("User claims updated:", data.user.user_metadata);
          
          // Refresh session to update JWT with new claims
          const { error: sessionError } = await supabase.auth.refreshSession();
          if (sessionError) {
            console.error("Error refreshing session:", sessionError);
          }
        }
      }
    } catch (err) {
      console.error("Error in refreshUserClaims:", err);
    }
  }, []);

  return { refreshUserClaims };
}
