import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { secureSessionStore } from "@/utils/encryption";
import { devLog, errorLog } from "@/utils/logger";

export function useSessionManager() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    devLog("Setting up Supabase auth listener");
    
    // First set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      devLog("Auth state changed", { event, userId: currentSession?.user?.id || "no user" });
      
      if (currentSession?.user) {
        devLog("User data in auth change", currentSession.user.id);
        // Don't log user metadata in production (using devLog)
        devLog("User metadata from session", currentSession.user.user_metadata);
        // Garantir branch_id e is_super_admin no user_metadata
        (async () => {
          let updated = false;
          let newMetadata = { ...currentSession.user.user_metadata };
          if (!('branch_id' in newMetadata) || !('is_super_admin' in newMetadata)) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('branch_id')
              .eq('id', currentSession.user.id)
              .maybeSingle();
            if (profile?.branch_id && !('branch_id' in newMetadata)) {
              newMetadata.branch_id = profile.branch_id;
              updated = true;
            }
            if (!('is_super_admin' in newMetadata)) {
              newMetadata.is_super_admin = false;
              updated = true;
            }
            if (updated) {
              await supabase.auth.updateUser({ data: newMetadata });
              currentSession.user.user_metadata = newMetadata;
            }
          }
          setSession(currentSession);
          setUser({ ...currentSession.user, user_metadata: newMetadata });
        })();
        
        // Store session info securely
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const isAdmin = 
            currentSession.user.user_metadata?.is_admin === true || 
            currentSession.user.user_metadata?.role === "admin" ||
            currentSession.user.email === "admin@example.com" ||
            currentSession.user.email === "cpd@sapiens-psi.com.br";
            
          if (isAdmin) {
            secureSessionStore("admin_access_validated", "true");
            secureSessionStore("admin_email", currentSession.user.email || "");
          }
        }
      } else {
        devLog("No user in session");
        setSession(null);
        setUser(null);
        sessionStorage.clear(); // Clear any secure session data
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
              devLog("Special admin account detected", userEmail);
              
              try {
                // Get the current user's profile from the database
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', currentSession.user.id)
                  .maybeSingle();
                
                if (profileError) {
                  errorLog("Error fetching admin profile", profileError);
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
                    errorLog("Error updating admin profile", upsertError);
                  } else {
                    devLog("Admin profile updated for special account");
                  }
                } else {
                  devLog("Admin profile already exists for special account");
                }
              } catch (updateError) {
                errorLog("Error in admin profile update", updateError);
              }
            }
          } catch (error) {
            errorLog("Error processing user session", error);
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
          errorLog("Error getting initial session", error);
          setLoading(false);
          return;
        }
        
        devLog("Initial session check", currentSession?.user?.id || "No session");
        
        if (currentSession) {
          // Garantir branch_id e is_super_admin no user_metadata
          (async () => {
            let updated = false;
            let newMetadata = { ...currentSession.user.user_metadata };
            if (!('branch_id' in newMetadata) || !('is_super_admin' in newMetadata)) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('branch_id')
                .eq('id', currentSession.user.id)
                .maybeSingle();
              if (profile?.branch_id && !('branch_id' in newMetadata)) {
                newMetadata.branch_id = profile.branch_id;
                updated = true;
              }
              if (!('is_super_admin' in newMetadata)) {
                newMetadata.is_super_admin = false;
                updated = true;
              }
              if (updated) {
                await supabase.auth.updateUser({ data: newMetadata });
                currentSession.user.user_metadata = newMetadata;
              }
            }
            setSession(currentSession);
            setUser({ ...currentSession.user, user_metadata: newMetadata });
          })();
          
          // Check if user is admin and store securely
          const isAdmin = 
            currentSession.user.user_metadata?.is_admin === true || 
            currentSession.user.user_metadata?.role === "admin" ||
            currentSession.user.email === "admin@example.com" ||
            currentSession.user.email === "cpd@sapiens-psi.com.br";
            
          if (isAdmin) {
            secureSessionStore("admin_access_validated", "true");
            secureSessionStore("admin_email", currentSession.user.email || "");
          }
          
          setLoading(false);
        } else {
          devLog("No existing session found");
          setLoading(false);
        }
      } catch (err) {
        errorLog("Unexpected error during session initialization", err);
        setLoading(false);
      }
    };
    
    initializeSession();

    return () => {
      devLog("Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading };
}
