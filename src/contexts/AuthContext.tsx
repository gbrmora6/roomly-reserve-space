import React, { createContext, useContext } from "react";
import { useSessionManager } from "@/hooks/useSessionManager";
import { useAuthOperations } from "@/hooks/useAuthOperations";
import { useUserClaims } from "@/hooks/useUserClaims";

interface AuthContextType {
  user: ReturnType<typeof useSessionManager>["user"];
  session: ReturnType<typeof useSessionManager>["session"];
  loading: ReturnType<typeof useSessionManager>["loading"];
  signIn: ReturnType<typeof useAuthOperations>["signIn"];
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: ReturnType<typeof useAuthOperations>["signOut"];
  refreshUserClaims: ReturnType<typeof useUserClaims>["refreshUserClaims"];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useSessionManager();
  const { signIn, signOut } = useAuthOperations();
  const { refreshUserClaims } = useUserClaims();
  
  // Placeholder para manter a API consistente, implementar se necessário
  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    // Esta função est�� implementada no useAuthOperations mas não está sendo usada aqui
    // Mantemos como placeholder para não quebrar as interfaces
    console.warn("signUp not fully implemented in AuthContext");
  };

  // Log auth state on changes for debugging
  React.useEffect(() => {
    console.log("AuthContext state changed:", {
      authenticated: !!user,
      userId: user?.id || "none",
      loading,
    });
  }, [user, loading]);

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUserClaims
  };

  return (
    <AuthContext.Provider value={value}>
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
