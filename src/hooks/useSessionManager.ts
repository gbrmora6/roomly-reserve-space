
import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSessionManager() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Setting up Supabase auth listener");
    
    // First set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log("Auth state changed:", event);
      console.log("User data:", currentSession?.user?.id || "No user");
      
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      // Update loading state if we have clear auth state information
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setLoading(false);
      }
      
      // If we have a session and user, check user role from profiles table
      if (currentSession?.user) {
        console.log("User metadata from session:", currentSession.user.user_metadata);
        
        // Use setTimeout to avoid potential deadlocks with Supabase client
        setTimeout(async () => {
          try {
            const userEmail = currentSession.user.email;
            
            // Check if this is one of our special admin emails
            const isSpecialAdmin = 
              userEmail === "admin@example.com" || 
              userEmail === "cpd@sapiens-psi.com.br";
              
            if (isSpecialAdmin) {
              console.log("Special admin account detected:", userEmail);
              
              try {
                // Get the current user's profile from the database
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', currentSession.user.id)
                  .single();
                
                // If profile doesn't have admin role, update it
                if (profileError || profile?.role !== 'admin') {
                  // First make sure profile exists
                  const { error: upsertError } = await supabase
                    .from('profiles')
                    .upsert({
                      id: currentSession.user.id,
                      role: 'admin',
                      first_name: currentSession.user.user_metadata.first_name || 'Admin',
                      last_name: currentSession.user.user_metadata.last_name || 'User'
                    });
                  
                  if (upsertError) {
                    console.error("Error updating admin profile:", upsertError);
                  } else {
                    console.log("Admin profile updated for special account");
                  }
                }
              } catch (updateError) {
                console.error("Error in admin profile update:", updateError);
              }
            }
          } catch (error) {
            console.error("Error processing user session:", error);
          } finally {
            setLoading(false);
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setLoading(false);
      }
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Initial session check:", currentSession?.user?.id || "No session");
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      if (!currentSession) {
        setLoading(false);
      }
      // If session exists, the auth change handler above will handle loading state
    }).catch(error => {
      console.error("Error getting session:", error);
      setLoading(false);
    });

    return () => {
      console.log("Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading };
}
