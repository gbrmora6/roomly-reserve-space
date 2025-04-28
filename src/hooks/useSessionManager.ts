
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
      
      // If we have a session and user, check for special admin emails
      if (currentSession?.user) {
        console.log("User metadata from session:", currentSession.user.user_metadata);
        
        // Use setTimeout to avoid potential deadlocks with Supabase client
        setTimeout(async () => {
          try {
            const userEmail = currentSession.user.email;
            
            // Check if this is one of our special admin emails
            const isSuperAdmin = 
              userEmail === "admin@example.com" || 
              userEmail === "cpd@sapiens-psi.com.br";
              
            if (isSuperAdmin) {
              console.log("Special admin account detected:", userEmail);
              
              // We don't need to update admin claims on every auth state change
              // Only do it if the user doesn't already have the admin role
              if (currentSession.user.user_metadata?.role !== "admin" || 
                  !currentSession.user.user_metadata?.is_admin) {
                
                console.log("Setting admin privileges for special account");
                
                try {
                  const { data, error } = await supabase.auth.updateUser({
                    data: { 
                      role: "admin",
                      is_admin: true,
                      is_super_admin: true
                    }
                  });
                  
                  if (error) {
                    console.error("Error updating admin claims:", error);
                  } else if (data?.user) {
                    console.log("Admin claims set:", data.user.user_metadata);
                    setUser(data.user);
                  }
                } catch (updateError) {
                  console.error("Error in updateUser:", updateError);
                }
              }
            } else {
              // For non-admin users, fetch the role from profiles
              // We don't need to check this on every auth state change
              if (!currentSession.user.user_metadata?.role) {
                try {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', currentSession.user.id)
                    .single();
                  
                  if (profile?.role) {
                    const isAdmin = profile.role === 'admin';
                    
                    console.log("Updating user JWT claims with role:", profile.role, "isAdmin:", isAdmin);
                    
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
                } catch (profileError) {
                  console.error("Error fetching profile:", profileError);
                }
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
