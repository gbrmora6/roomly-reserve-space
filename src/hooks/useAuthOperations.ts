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
      
      // Check if this is a special admin account
      if (data?.user) {
        const isSuperAdmin = 
          data.user.email === "admin@example.com" || 
          data.user.email === "cpd@sapiens-psi.com.br";
        
        if (isSuperAdmin) {
          devLog("Special admin account detected, setting full admin privileges");
          
          try {
            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                role: "admin",
                is_admin: true,
                is_super_admin: true
              }
            });
            
            if (updateError) {
              errorLog("Error setting admin privileges", updateError);
            } else {
              devLog("Admin privileges successfully set for", data.user.email);
              
              // Force refresh the session
              const { error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                errorLog("Error refreshing session after admin privileges update", refreshError);
              } else {
                devLog("Session refreshed with admin privileges");
                // Securely store admin status in session
                secureSessionStore("admin_access_validated", "true");
                secureSessionStore("admin_email", data.user.email || "");
              }
            }
          } catch (adminError) {
            errorLog("Error in admin privileges update", adminError);
          }
        }
      }
      
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: "admin",
            branch_id: branchId
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
      const { error } = await supabase.auth.signUp({
        email: "cpd@sapiens-psi.com.br",
        password: "123456789",
        options: {
          data: {
            first_name: "CPD",
            last_name: "Admin",
            role: "admin",
            is_admin: true,
            is_super_admin: true
          },
        },
      });

      if (error) throw error;

      toast({
        title: "SuperAdmin criado com sucesso!",
        description: "SuperAdmin criado com as credenciais especificadas.",
      });
    } catch (error: any) {
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
      devLog("Attempting to sign out");
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        errorLog("Logout error", error.message);
        toast({
          variant: "destructive",
          title: "Erro ao fazer logout",
          description: error.message,
        });
        throw error;
      }
      
      devLog("Logout successful");
      
      // Clear any cached security tokens
      sessionStorage.clear();
      
      // Aguarde um curto período para garantir que a sessão seja atualizada
      setTimeout(() => {
        navigate("/login");
        toast({
          title: "Logout realizado com sucesso!",
        });
      }, 100);
    } catch (error: any) {
      errorLog("Logout error (catch)", error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer logout",
        description: error.message,
      });
      throw error;
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
