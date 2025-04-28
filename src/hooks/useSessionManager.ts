
import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSessionManager() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event);
        setSession(currentSession);
        
        if (currentSession?.user) {
          console.log("User metadata from session:", currentSession.user.user_metadata);
          
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', currentSession.user.id)
              .single();
            
            if (profile?.role) {
              console.log("Role from profile database:", profile.role);
              
              const updatedUser = {
                ...currentSession.user,
                user_metadata: {
                  ...currentSession.user.user_metadata,
                  role: profile.role
                }
              };
              setUser(updatedUser);
              
              const { data, error } = await supabase.auth.updateUser({
                data: { 
                  role: profile.role
                }
              });
              
              if (error) {
                console.error("Error updating user claims on auth change:", error);
              } else if (data?.user) {
                console.log("Auth state change: claims updated with role", data.user.user_metadata);
                setUser(data.user);
                
                await supabase.auth.refreshSession();
              }
            } else {
              setUser(currentSession.user);
            }
          } catch (error) {
            console.error("Error fetching user profile:", error);
            setUser(currentSession.user);
          }
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      
      if (currentSession?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentSession.user.id)
            .single();
          
          if (profile?.role) {
            const updatedUser = {
              ...currentSession.user,
              user_metadata: {
                ...currentSession.user.user_metadata,
                role: profile.role
              }
            };
            setUser(updatedUser);
            
            const { data, error } = await supabase.auth.updateUser({
              data: { 
                role: profile.role
              }
            });
            
            if (error) {
              console.error("Error updating initial claims:", error);
            } else if (data?.user) {
              console.log("Initial claims updated with role", data.user.user_metadata);
              setUser(data.user);
              await supabase.auth.refreshSession();
            }
          } else {
            setUser(currentSession.user);
          }
        } catch (error) {
          console.error("Error fetching initial user profile:", error);
          setUser(currentSession.user);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
