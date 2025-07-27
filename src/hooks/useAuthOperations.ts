import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { secureSessionStore } from "@/utils/encryption";
import { devLog, errorLog } from "@/utils/logger";

// Maximum number of login attempts to track
const MAX_TRACKED_ATTEMPTS = 5;
// Window for tracking login attempts (in milliseconds)
const ATTEMPT_TRACKING_WINDOW = 15 * 60 * 1000; // 15 minutes

export function useAuthOperations() {
  const navigate = useNavigate();

  const signIn = async (email: string, password: string) => {
    try {
      // Check for previous login attempts
      checkForRateLimiting(email);
      
      devLog("Attempting to sign in with", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        errorLog("Login error", error.message);
        // Record failed attempt
        recordFailedLoginAttempt(email);
        
        toast({
          variant: "destructive",
          title: "Erro ao fazer login",
          description: error.message || "Verifique suas credenciais e tente novamente.",
        });
        throw error;
      }
      
      devLog("Login successful, user", data?.user?.id);
      
      // Clear any failed attempt records on successful login
      clearFailedLoginAttempts(email);
      
      // SECURITY FIX: Removed automatic admin privilege assignment
      // Admin privileges must be set through database roles, not client-side logic
      
      // Toast de sucesso
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!",
      });
      
      // Navegação para a página principal depois que todos os processos estiverem concluídos
      navigate("/rooms");
      
      return data;
    } catch (error: any) {
      errorLog("Login error (catch)", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, branchId: string) => {
    try {
      // SECURITY FIX: Add password strength validation
      if (password.length < 8) {
        throw new Error("A senha deve ter pelo menos 8 caracteres");
      }
      
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        throw new Error("A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número");
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            role: "client",
            branch_id: branchId
          },
        },
      });

      if (error) throw error;

      // Criar perfil do usuário na tabela profiles
      if (data.user) {
      const { error: profileError } = await (supabase as any).rpc('create_user_profile', {
        user_id: data.user.id,
        user_email: email,
        first_name: firstName,
        last_name: lastName,
        user_role: 'client',
        user_branch_id: '64a43fed-587b-415c-aeac-0abfd7867566' // UUID da Filial Padrão
      });

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
          // Não bloquear o registro se houver erro no perfil
        }
      }

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
    throw new Error("SECURITY: Direct super admin creation disabled. Use database functions for admin account creation.");
  };

  const signOut = async () => {
    try {
      devLog("Attempting to sign out");
      
      // Clear any cached security tokens first
      try {
        sessionStorage.clear();
        devLog("Session storage cleared");
      } catch (storageError) {
        errorLog("Error clearing session storage", storageError);
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        errorLog("Logout error from Supabase", error.message);
        // Even if Supabase logout fails, we still navigate to login
        // since we've already cleared local storage
        devLog("Proceeding with logout despite Supabase error");
      } else {
        devLog("Supabase logout successful");
      }
      
      // Always navigate to login and show success message
      // regardless of Supabase error since local session is cleared
      setTimeout(() => {
        navigate("/login");
        toast({
          title: "Logout realizado com sucesso!",
        });
      }, 100);
      
    } catch (error: any) {
      errorLog("Logout error (catch)", error);
      
      // Even in case of unexpected error, clear storage and navigate
      try {
        sessionStorage.clear();
      } catch (storageError) {
        errorLog("Error clearing session storage in catch", storageError);
      }
      
      // Navigate to login even if there was an error
      setTimeout(() => {
        navigate("/login");
        toast({
          title: "Logout realizado!",
          description: "Você foi desconectado.",
        });
      }, 100);
    }
  };

  return { signIn, signUp, signOut, createSuperAdmin };
}

// Helper functions for rate limiting
function getLoginAttemptsKey(email: string): string {
  return `login_attempts_${email.toLowerCase()}`;
}

function recordFailedLoginAttempt(email: string): void {
  const key = getLoginAttemptsKey(email);
  const now = Date.now();
  
  // Get existing attempts
  let attempts = [];
  try {
    const stored = localStorage.getItem(key);
    attempts = stored ? JSON.parse(stored) : [];
    
    // Filter out old attempts outside our tracking window
    attempts = attempts.filter((timestamp: number) => 
      now - timestamp < ATTEMPT_TRACKING_WINDOW
    );
  } catch (e) {
    attempts = [];
  }
  
  // Add the new attempt
  attempts.push(now);
  
  // Store the updated attempts
  localStorage.setItem(key, JSON.stringify(attempts));
}

function clearFailedLoginAttempts(email: string): void {
  localStorage.removeItem(getLoginAttemptsKey(email));
}

function checkForRateLimiting(email: string): void {
  const key = getLoginAttemptsKey(email);
  const now = Date.now();
  
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return;
    
    const attempts = JSON.parse(stored);
    
    // Filter to only recent attempts within our tracking window
    const recentAttempts = attempts.filter((timestamp: number) => 
      now - timestamp < ATTEMPT_TRACKING_WINDOW
    );
    
    // Check if there are too many recent attempts
    if (recentAttempts.length >= MAX_TRACKED_ATTEMPTS) {
      // Calculate when the oldest attempt will expire
      const oldestAttempt = Math.min(...recentAttempts);
      const unlockTime = oldestAttempt + ATTEMPT_TRACKING_WINDOW;
      const waitSeconds = Math.ceil((unlockTime - now) / 1000);
      
      throw new Error(`Muitas tentativas de login. Por favor, aguarde ${waitSeconds} segundos antes de tentar novamente.`);
    }
    
    // Update the stored attempts (this removes any that are too old)
    localStorage.setItem(key, JSON.stringify(recentAttempts));
  } catch (e: any) {
    if (e.message && e.message.includes("Muitas tentativas")) {
      toast({
        variant: "destructive",
        title: "Acesso temporariamente bloqueado",
        description: e.message,
      });
      throw e;
    }
    // If there was a parsing error, just clear the attempts
    localStorage.removeItem(key);
  }
}
