
import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
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
  const navigate = useNavigate();

  // Directly implement state management here instead of using the hook
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Refresh user claims function
  const refreshUserClaims = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log("No active session found, skipping claims refresh");
        return;
      }
      
      // First check if user is one of the superadmins by email
      const userEmail = session.user.email;
      const isSuperAdmin = 
        userEmail === "admin@example.com" || 
        userEmail === "cpd@sapiens-psi.com.br";
      
      // Force admin status for superadmins
      if (isSuperAdmin) {
        console.log("SuperAdmin detected by email, setting admin privileges");
        
        const { data, error: updateError } = await supabase.auth.updateUser({
          data: { 
            role: "admin",
            is_admin: true,
            is_super_admin: true
          }
        });
        
        if (updateError) {
          console.error("Error updating superadmin claims:", updateError);
          return;
        }
        
        if (data?.user) {
          console.log("SuperAdmin claims updated successfully:", data.user.user_metadata);
          
          // Refresh session to update JWT claims
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error("Error refreshing session after superadmin claims update:", refreshError);
          } else {
            console.log("Session refreshed with new superadmin JWT claims");
          }
        }
        
        return;
      }
      
      // For regular users, check if we need to update based on profile
      console.log("Current user metadata:", session.user.user_metadata);
      
      // Fetch profile data to verify role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error("Error fetching user profile for claims refresh:", profileError);
        return;
      }
      
      if (!profile?.role) {
        console.log("No role found in profile data, skipping claims update");
        return;
      }

      // Check if user role has changed or admin status needs updating
      const currentRole = session.user.user_metadata?.role;
      const isAdmin = profile.role === 'admin';
      const currentIsAdmin = session.user.user_metadata?.is_admin === true;
      const currentIsSuperAdmin = session.user.user_metadata?.is_super_admin === true;
      
      // Only update if there's a mismatch
      if (currentRole === profile.role && currentIsAdmin === isAdmin && currentIsSuperAdmin === isSuperAdmin) {
        console.log("User claims already up to date, skipping update");
        return;
      }

      console.log("Updating user JWT claims to match profile role:", {
        role: profile.role,
        is_admin: isAdmin,
        is_super_admin: isSuperAdmin
      });
      
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { 
          role: profile.role,
          is_admin: isAdmin,
          is_super_admin: isSuperAdmin
        }
      });
      
      if (updateError) {
        console.error("Error updating user claims:", updateError);
        toast({
          variant: "destructive",
          title: "Erro de autenticação",
          description: "Não foi possível atualizar suas permissões. Por favor, tente novamente.",
        });
        return;
      }
      
      if (data?.user) {
        console.log("User claims updated successfully:", data.user.user_metadata);
        
        // Refresh session to update JWT claims
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error("Error refreshing session after claims update:", refreshError);
        } else {
          console.log("Session refreshed with new JWT claims");
        }
      }
    } catch (err) {
      console.error("Error in refreshUserClaims:", err);
    }
  };

  // Authentication operations
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      console.log("Attempting to sign in with:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error.message);
        toast({
          variant: "destructive",
          title: "Erro ao fazer login",
          description: error.message || "Verifique suas credenciais e tente novamente.",
        });
        throw error;
      }
      
      console.log("Login successful, user:", data?.user?.id);
      
      // Check if this is a special admin account
      if (data?.user) {
        const isSuperAdmin = 
          data.user.email === "admin@example.com" || 
          data.user.email === "cpd@sapiens-psi.com.br";
        
        if (isSuperAdmin) {
          console.log("Special admin account detected, setting full admin privileges");
          
          try {
            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                role: "admin",
                is_admin: true,
                is_super_admin: true
              }
            });
            
            if (updateError) {
              console.error("Error setting admin privileges:", updateError);
            } else {
              console.log("Admin privileges successfully set for", data.user.email);
              
              // Force refresh the session
              const { error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.error("Error refreshing session after admin privileges update:", refreshError);
              } else {
                console.log("Session refreshed with admin privileges");
              }
            }
          } catch (adminError) {
            console.error("Error in admin privileges update:", adminError);
          }
        }
      }
      
      // Navigate and show success toast
      navigate("/rooms");
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!",
      });
    } catch (error: any) {
      console.error("Login error (catch):", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string): Promise<void> => {
    try {
      // Verificar se o email é um dos superadmins
      const isSuperAdmin = email === "admin@example.com" || email === "cpd@sapiens-psi.com.br";
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: isSuperAdmin ? "admin" : "client",
            is_admin: isSuperAdmin,
            is_super_admin: isSuperAdmin
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

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
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
    }
  };

  // Session management with useEffect
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
  }, [navigate]);

  // Log auth state on changes for debugging
  useEffect(() => {
    console.log("AuthContext state changed:", {
      authenticated: !!user,
      userId: user?.id || "none",
      loading,
    });
  }, [user, loading]);

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
