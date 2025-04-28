
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
      console.log("Refreshing user claims...");
      
      // Fetch current user profile from the database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error("Error fetching user profile for claims refresh:", profileError);
        return;
      }
      
      if (profile?.role === 'admin') {
        console.log("Updating admin claims for user");
        
        // Update user metadata with admin role and is_admin flag
        const { data, error: updateError } = await supabase.auth.updateUser({
          data: { 
            role: 'admin',
            is_admin: true
          }
        });
        
        if (updateError) {
          console.error("Error updating admin claims:", updateError);
          return;
        }
        
        if (data?.user) {
          console.log("Admin claims updated successfully:", data.user.user_metadata);
          setUser(data.user);
        }
      }
    } catch (err) {
      console.error("Error in refreshUserClaims:", err);
    }
  }, [session]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event);
        setSession(currentSession);
        
        if (currentSession?.user) {
          console.log("User metadata from session:", currentSession.user.user_metadata);
          
          try {
            // Always check the profile in database to ensure updated information
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', currentSession.user.id)
              .single();
            
            if (profile?.role) {
              console.log("Role from profile database:", profile.role);
              
              // Update user metadata with the profile role
              const updatedUser = {
                ...currentSession.user,
                user_metadata: {
                  ...currentSession.user.user_metadata,
                  role: profile.role
                }
              };
              setUser(updatedUser);
              
              // Update JWT claims for admin users immediately
              if (profile.role === 'admin') {
                try {
                  console.log("Updating claims for admin user");
                  const { error: updateError } = await supabase.auth.updateUser({
                    data: { 
                      is_admin: true,
                      role: 'admin'
                    }
                  });
                  
                  if (updateError) {
                    console.error("Error updating admin claims:", updateError);
                  } else {
                    console.log("Admin claims updated successfully");
                    
                    // Force refresh user data after updating claims
                    const { data } = await supabase.auth.getUser();
                    if (data?.user) {
                      setUser(data.user);
                    }
                  }
                } catch (err) {
                  console.error("Error in admin claims update:", err);
                }
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

    // Check for existing session
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
            
            // Update user metadata with the profile role
            const updatedUser = {
              ...currentSession.user,
              user_metadata: {
                ...currentSession.user.user_metadata,
                role: profile.role
              }
            };
            setUser(updatedUser);
            
            // Update JWT claims for admin users
            if (profile.role === 'admin') {
              try {
                console.log("Initial setup: Updating admin claims");
                const { data, error: updateError } = await supabase.auth.updateUser({
                  data: { 
                    is_admin: true,
                    role: 'admin'
                  }
                });
                
                if (updateError) {
                  console.error("Error updating initial admin claims:", updateError);
                } else {
                  console.log("Initial admin claims updated successfully", data?.user?.user_metadata);
                  
                  if (data?.user) {
                    setUser(data.user);
                  }
                  
                  // Force token refresh
                  await supabase.auth.refreshSession();
                }
              } catch (err) {
                console.error("Error in initial admin claims update:", err);
              }
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
            role: "client", // Definir role padrão como "client"
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
      
      // Clear user data from state
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
