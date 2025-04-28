import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  refreshUserClaims: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refreshUserClaims = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      console.log("Refreshing user claims - simplified version");
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error("Error fetching user profile for claims refresh:", profileError);
        return;
      }
      
      console.log("Profile data from database:", profile);
      
      if (profile?.role) {
        const { data, error: updateError } = await supabase.auth.updateUser({
          data: { 
            role: profile.role
          }
        });
        
        if (updateError) {
          console.error("Error updating user claims:", updateError);
          return;
        }
        
        if (data?.user) {
          console.log("User claims updated with role:", data.user.user_metadata);
          setUser(data.user);
          
          const { data: sessionData } = await supabase.auth.refreshSession();
          if (sessionData.session) {
            setSession(sessionData.session);
          }
        }
      }
    } catch (err) {
      console.error("Error in refreshUserClaims:", err);
    }
  }, [session]);

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
        console.log("Initial user metadata:", currentSession.user.user_metadata);
        
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentSession.user.id)
            .single();
          
          if (profile?.role) {
            console.log("Initial role from profile:", profile.role);
            
            const updatedUser = {
              ...currentSession.user,
              user_metadata: {
                ...currentSession.user.user_metadata,
                role: profile.role
              }
            };
            setUser(updatedUser);
            
            try {
              const { data, error } = await supabase.auth.updateUser({
                data: { 
                  role: profile.role
                }
              });
              
              if (error) {
                console.error("Error updating initial claims:", error);
              } else {
                console.log("Initial claims updated with role", data?.user?.user_metadata);
                
                if (data?.user) {
                  setUser(data.user);
                }
                
                await supabase.auth.refreshSession();
              }
            } catch (err) {
              console.error("Error in initial claims update:", err);
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

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      navigate("/rooms");
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message,
      });
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: "client",
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Conta criada com sucesso!",
        description: "Você já pode fazer login.",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: error.message,
      });
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      
      navigate("/login");
      toast({
        title: "Logout realizado com sucesso!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer logout",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      signIn, 
      signUp, 
      signOut, 
      loading, 
      refreshUserClaims 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
