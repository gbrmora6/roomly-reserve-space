
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
      (event, currentSession) => {
        console.log("Auth state changed:", event);
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        // If we have a session and user, fetch the role from profiles
        if (currentSession?.user) {
          console.log("User detected in auth change:", currentSession.user.id);
          
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', currentSession.user.id)
                .single();
              
              if (profile?.role) {
                console.log("Role from profile database:", profile.role);
                
                // Update user metadata with role
                const { data, error } = await supabase.auth.updateUser({
                  data: { role: profile.role }
                });
                
                if (error) {
                  console.error("Error updating user claims:", error);
                } else if (data?.user) {
                  console.log("Claims updated with role:", data.user.user_metadata);
                  setUser(data.user);
                  await supabase.auth.refreshSession();
                }
              }
            } catch (error) {
              console.error("Error fetching user profile:", error);
            } finally {
              setLoading(false);
            }
          }, 0);
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
