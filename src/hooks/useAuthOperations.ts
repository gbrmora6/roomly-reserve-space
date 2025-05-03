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
      console.log("Attempting to sign out");
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error:", error.message);
        toast({
          variant: "destructive",
          title: "Erro ao fazer logout",
          description: error.message,
        });
        throw error;
      }
      
      console.log("Logout successful");
      navigate("/login");
      toast({
        title: "Logout realizado com sucesso!",
      });
    } catch (error: any) {
      console.error("Logout error (catch):", error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer logout",
        description: error.message,
      });
      throw error;
    }
  };

  return { signIn, signUp, createSuperAdmin, signOut };
}
