import { createContext, useContext, useEffect, useState } from "react";
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);
        setSession(session);
        
        if (session?.user) {
          console.log("User metadata from session:", session.user.user_metadata);
          
          try {
            // Sempre verificar o perfil no banco de dados para garantir informações atualizadas
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            if (profile?.role) {
              console.log("Role from profile database:", profile.role);
              
              // Atualizar os metadados do usuário com a role do perfil
              const updatedUser = {
                ...session.user,
                user_metadata: {
                  ...session.user.user_metadata,
                  role: profile.role
                }
              };
              setUser(updatedUser);
              
              // Atualizar os claims JWT para incluir a flag is_admin se o usuário for administrador
              if (profile.role === 'admin') {
                try {
                  // Aqui você pode adicionar console.log para depuração
                  console.log("Atualizando claims para admin user");
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
                  }
                } catch (err) {
                  console.error("Error in admin claims update:", err);
                }
              }
            } else {
              setUser(session.user);
            }
          } catch (error) {
            console.error("Error fetching user profile:", error);
            setUser(session.user);
          }
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        console.log("Initial user metadata:", session.user.user_metadata);
        
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (profile?.role) {
            console.log("Initial role from profile:", profile.role);
            
            // Atualizar os metadados do usuário com a role do perfil
            const updatedUser = {
              ...session.user,
              user_metadata: {
                ...session.user.user_metadata,
                role: profile.role
              }
            };
            setUser(updatedUser);
            
            // Atualizar os claims JWT para incluir a flag is_admin se o usuário for administrador
            if (profile.role === 'admin') {
              try {
                console.log("Initial setup: Updating admin claims");
                const { error: updateError } = await supabase.auth.updateUser({
                  data: { 
                    is_admin: true,
                    role: 'admin'
                  }
                });
                
                if (updateError) {
                  console.error("Error updating initial admin claims:", updateError);
                } else {
                  console.log("Initial admin claims updated successfully");
                }
              } catch (err) {
                console.error("Error in initial admin claims update:", err);
              }
            }
          } else {
            setUser(session.user);
          }
        } catch (error) {
          console.error("Error fetching initial user profile:", error);
          setUser(session.user);
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
    <AuthContext.Provider value={{ user, session, signIn, signUp, signOut, loading }}>
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
