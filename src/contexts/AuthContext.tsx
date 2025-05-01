
import { createContext, useContext, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useSessionManager } from "@/hooks/useSessionManager";
import { useAuthOperations } from "@/hooks/useAuthOperations";
import { useUserClaims } from "@/hooks/useUserClaims";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  refreshUserClaims: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Get session state from the session manager
  const { user, session, loading } = useSessionManager();
  const { signIn: authSignIn, signUp, signOut } = useAuthOperations();
  const { refreshUserClaims } = useUserClaims();
  
  // Log auth state on changes for debugging
  useEffect(() => {
    console.log("AuthContext state changed:", {
      authenticated: !!user,
      userId: user?.id || "none",
      loading,
    });
  }, [user, loading]);
  
  // Wrap the signIn function to match the AuthContextType
  const signIn = async (email: string, password: string): Promise<void> => {
    await authSignIn(email, password);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      signIn, 
      signUp, 
      signOut, 
      loading, 
      refreshUserClaims 
    }}>
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
