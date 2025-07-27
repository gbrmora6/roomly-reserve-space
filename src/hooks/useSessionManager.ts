import React, { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { secureSessionStoreV2, getSecureSessionItemV2 } from "@/utils/secureEncryption";
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
        // Garantir branch_id no user_metadata
        (async () => {
          let updated = false;
          let newMetadata = { ...currentSession.user.user_metadata };
          if (!('branch_id' in newMetadata)) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('branch_id')
              .eq('id', currentSession.user.id)
              .maybeSingle();
            if (profile?.branch_id && !('branch_id' in newMetadata)) {
              newMetadata.branch_id = profile.branch_id;
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
        
        // Store session info securely using proper encryption
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setTimeout(async () => {
            await secureSessionStoreV2("session_validated", "true");
            await secureSessionStoreV2("user_email", currentSession.user.email || "");
          }, 0);
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
      
      // Set loading state for clear events
      if (event === 'SIGNED_OUT') {
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
          // Garantir branch_id no user_metadata
          (async () => {
            let updated = false;
            let newMetadata = { ...currentSession.user.user_metadata };
            if (!('branch_id' in newMetadata)) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('branch_id')
                .eq('id', currentSession.user.id)
                .maybeSingle();
              if (profile?.branch_id && !('branch_id' in newMetadata)) {
                newMetadata.branch_id = profile.branch_id;
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
          
          // Store session info securely using proper encryption
          setTimeout(async () => {
            await secureSessionStoreV2("session_validated", "true");
            await secureSessionStoreV2("user_email", currentSession.user.email || "");
          }, 0);
          
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
