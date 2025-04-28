
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
        throw error;
      }
      
      console.log("Login successful, user:", data?.user?.id);
      
      // Get profile role and update user JWT claims
      if (data?.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
            
          if (profileError) {
            console.error("Error fetching user profile:", profileError);
          } else if (profile?.role) {
            const isAdmin = profile.role === 'admin';
            const isSuperAdmin = data.user.email === "admin@example.com";
            
            const { error: updateError } = await supabase.auth.updateUser({
              data: { 
                role: profile.role,
                is_admin: isAdmin,
                is_super_admin: isSuperAdmin
              }
            });
            
            if (updateError) {
              console.error("Error updating user claims:", updateError);
            } else {
              console.log("Updated user JWT claims with role:", profile.role, 
                         "is_admin:", isAdmin,
                         "is_super_admin:", isSuperAdmin);
              
              // Explicitly refresh the session to update JWT with new claims
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
      
      navigate("/rooms");
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!",
      });
    } catch (error: any) {
      console.error("Login error (catch):", error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message || "Ocorreu um erro ao tentar fazer login. Verifique suas credenciais.",
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
            is_admin: false,
            is_super_admin: email === "admin@example.com"
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

  return { signIn, signUp, signOut };
}
