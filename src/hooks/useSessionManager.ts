
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
        
        // If we have a session and user, fetch the role from profiles
        if (currentSession?.user) {
          console.log("User detected in auth change:", currentSession.user.id);
          
          // We'll only fetch profile data on sign_in or token_refreshed events
          // to avoid excessive API calls and prevent rate limiting
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', currentSession.user.id)
                .single();
              
              if (profile?.role) {
                console.log("Role from profile database:", profile.role);
                const isAdmin = profile.role === 'admin';
                
                // Update user metadata with role and is_admin flag
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
              }
            } catch (error) {
              console.error("Error fetching user profile:", error);
            } finally {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
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
