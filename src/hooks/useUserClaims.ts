
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUserClaims() {
  const refreshUserClaims = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      console.log("Refreshing user claims - simplified version");
      
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
        const { data, error: updateError } = await supabase.auth.updateUser({
          data: { 
            role: profile.role
          }
        });
        
        if (updateError) {
          console.error("Error updating user claims:", updateError);
          return;
        }
        
        if (data?.user) {
          console.log("User claims updated with role:", data.user.user_metadata);
          
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
