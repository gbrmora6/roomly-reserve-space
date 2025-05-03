
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
      
      if (currentSession?.user) {
        console.log("User data:", currentSession.user.id);
        setSession(currentSession);
        setUser(currentSession.user);
      } else {
        console.log("No user in session");
        setSession(null);
        setUser(null);
      }
      
      // Update loading state if we have clear auth state information
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setLoading(false);
      }
      
      // Process special admin accounts
      if (currentSession?.user) {
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
                  .maybeSingle();
                
                if (profileError) {
                  console.error("Error fetching admin profile:", profileError);
                }
                
                // If profile doesn't exist or doesn't have admin role, update it
                if (profileError || !profile || profile?.role !== 'admin') {
                  // Create or update profile with admin role
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
                } else {
                  console.log("Admin profile already exists for special account");
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
    const initializeSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting initial session:", error);
          setLoading(false);
          return;
        }
        
        console.log("Initial session check:", currentSession?.user?.id || "No session");
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Unexpected error during session initialization:", err);
        setLoading(false);
      }
    };
    
    initializeSession();

    return () => {
      console.log("Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading };
}
