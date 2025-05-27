
import React, { createContext, useContext } from "react";
import { useSessionManager } from "@/hooks/useSessionManager";
import { useAuthOperations } from "@/hooks/useAuthOperations";
import { useUserClaims } from "@/hooks/useUserClaims";

/**
 * Interface que define os tipos de dados e funções disponíveis no contexto de autenticação
 */
interface AuthContextType {
  // Dados do usuário logado
  user: ReturnType<typeof useSessionManager>["user"];
  
  // Sessão atual do usuário
  session: ReturnType<typeof useSessionManager>["session"];
  
  // Estado de carregamento da autenticação
  loading: ReturnType<typeof useSessionManager>["loading"];
  
  // Função para fazer login
  signIn: ReturnType<typeof useAuthOperations>["signIn"];
  
  // Função para fazer cadastro
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  
  // Função para fazer logout
  signOut: ReturnType<typeof useAuthOperations>["signOut"];
  
  // Função para atualizar permissões do usuário
  refreshUserClaims: ReturnType<typeof useUserClaims>["refreshUserClaims"];
  
  // Função para criar super administrador
  createSuperAdmin: ReturnType<typeof useAuthOperations>["createSuperAdmin"];
}

// Criação do contexto de autenticação
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provedor do contexto de autenticação
 * Encapsula toda a lógica de autenticação e disponibiliza para componentes filhos
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Hooks para gerenciar sessão, operações de auth e claims do usuário
  const { user, session, loading } = useSessionManager();
  const { signIn, signUp: authSignUp, signOut, createSuperAdmin } = useAuthOperations();
  const { refreshUserClaims } = useUserClaims();
  
  /**
   * Função encapsulada para cadastro que mantém consistência da API
   * Remove o parâmetro role que não é usado neste contexto
   */
  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    await authSignUp(email, password, firstName, lastName, "");
  };

  // Log das mudanças de estado de autenticação para debugging
  React.useEffect(() => {
    console.log("AuthContext state changed:", {
      authenticated: !!user,
      userId: user?.id || "none",
      loading,
    });
  }, [user, loading]);

  // Objeto com todos os valores e funções disponibilizados pelo contexto
  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUserClaims,
    createSuperAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook customizado para usar o contexto de autenticação
 * Valida se está sendo usado dentro do AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
