
import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useSessionManager() {
  // Make sure useState is called directly inside the component function body
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
            } else {
              console.log("Regular user account");
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
        // If session exists, the auth change handler above will handle loading state
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
