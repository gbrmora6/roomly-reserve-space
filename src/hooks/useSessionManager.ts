
import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSessionManager() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event);
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        // Update loading state if we have clear auth state information
        if (!currentSession) {
          setLoading(false);
        }
        
        // If we have a session and user, fetch the role from profiles
        // but use setTimeout to avoid potential deadlocks with Supabase client
        if (currentSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', currentSession.user.id)
                .single();
              
              if (profile?.role) {
                const isAdmin = profile.role === 'admin';
                
                // Check if claims need updating before making an API call
                const needsUpdate = 
                  currentSession.user.user_metadata?.role !== profile.role || 
                  !!currentSession.user.user_metadata?.is_admin !== isAdmin;
                
                if (needsUpdate) {
                  console.log("Updating user metadata with role:", profile.role);
                  
                  const { data, error } = await supabase.auth.updateUser({
                    data: { 
                      role: profile.role, 
                      is_admin: isAdmin 
                    }
                  });
                  
                  if (error) {
                    console.error("Error updating user claims:", error);
                  } else if (data?.user) {
                    console.log("Claims updated:", data.user.user_metadata);
                    setUser(data.user);
                  }
                } else {
                  console.log("User claims already match profile role, skipping update");
                }
              }
            } catch (error) {
              console.error("Error fetching user profile:", error);
            } finally {
              setLoading(false);
            }
          }, 0);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Initial session check:", currentSession?.user?.id || "No session");
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      if (!currentSession) {
        setLoading(false);
      }
      // If session exists, the auth change handler above will handle loading state
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
