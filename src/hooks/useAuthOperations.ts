
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useAuthOperations() {
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, branchId: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          branch_id: branchId,
        },
      },
    });

    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const createSuperAdmin = async () => {
    const email = "cpd@sapiens-psi.com.br";
    const password = "123456789";
    
    // First create the user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: "Super",
          last_name: "Admin",
          role: "superadmin"
        }
      }
    });

    if (signUpError) {
      throw new Error(`Erro ao criar usuário: ${signUpError.message}`);
    }

    if (!signUpData.user) {
      throw new Error("Falha ao criar usuário");
    }

    // Update the user's role in the profiles table
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        role: "superadmin",
        first_name: "Super",
        last_name: "Admin"
      })
      .eq("id", signUpData.user.id);

    if (updateError) {
      throw new Error(`Erro ao atualizar perfil: ${updateError.message}`);
    }

    toast({
      title: "SuperAdmin criado com sucesso!",
      description: `Email: ${email} | Senha: ${password}`,
    });
  };

  return {
    signIn,
    signUp,
    signOut,
    createSuperAdmin,
  };
}
