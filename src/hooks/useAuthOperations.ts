
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useAuthOperations() {
  const navigate = useNavigate();

  const signIn = async (email: string, password: string) => {
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
        } else {
          // For non-admin users, get profile role
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.user.id)
              .single();
              
            if (profileError) {
              console.error("Error fetching user profile:", profileError);
            } else if (profile?.role) {
              console.log("Role from profile database:", profile.role);
              
              const isAdmin = profile.role === 'admin';
              
              const { error: updateError } = await supabase.auth.updateUser({
                data: { 
                  role: profile.role,
                  is_admin: isAdmin
                }
              });
              
              if (updateError) {
                console.error("Error updating user claims:", updateError);
              } else {
                console.log("Updated user JWT claims with role:", profile.role, "is_admin:", isAdmin);
                
                // Refresh session to update JWT with new claims
                const { error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError) {
                  console.error("Error refreshing session:", refreshError);
                } else {
                  console.log("Session refreshed with new claims");
                }
              }
            }
          } catch (profileError) {
            console.error("Error in profile update process:", profileError);
          }
        }
      }
      
      // Navigate and show success toast
      navigate("/rooms");
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!",
      });
      
      return data;
    } catch (error: any) {
      console.error("Login error (catch):", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
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

  const createSuperAdmin = async () => {
    try {
      const email = "cpd@sapiens-psi.com.br";
      const password = "123456789";
      const firstName = "Super";
      const lastName = "Admin";
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: "admin",
            is_admin: true,
            is_super_admin: true
          },
        },
      });

      if (error) {
        throw error;
      }
      
      toast({
        title: "Usuário SuperAdmin criado!",
        description: `Conta para ${email} foi criada com sucesso.`,
      });
      
      return data;
    } catch (error: any) {
      console.error("Error creating superadmin:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar SuperAdmin",
        description: error.message,
      });
      throw error;
    }
  };

  const signOut = async () => {
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

  return { signIn, signUp, signOut, createSuperAdmin };
}
