import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useAuthOperations = () => {
  const [isLoading, setIsLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Login realizado com sucesso!");
      return { data, error: null };
    } catch (error: any) {
      console.error("Error signing in:", error);
      toast.error(`Erro no login: ${error.message}`);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: any = {}) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) throw error;

      toast.success("Cadastro realizado com sucesso!");
      return { data, error: null };
    } catch (error: any) {
      console.error("Error signing up:", error);
      toast.error(`Erro no cadastro: ${error.message}`);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success("Logout realizado com sucesso!");
      return { error: null };
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast.error(`Erro no logout: ${error.message}`);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      toast.success("Email de recuperação enviado!");
      return { error: null };
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(`Erro ao enviar email de recuperação: ${error.message}`);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const createSuperAdmin = async (email: string, password: string, userData: any = {}) => {
    return signUp(email, password, userData);
  };

  return {
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    createSuperAdmin
  };
};