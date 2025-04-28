
import { createContext, useContext } from "react";
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
  const { user, session, loading } = useSessionManager();
  const { signIn: authSignIn, signUp, signOut } = useAuthOperations();
  const { refreshUserClaims } = useUserClaims();
  
  // Wrap the signIn function to match the AuthContextType
  const signIn = async (email: string, password: string): Promise<void> => {
    await authSignIn(email, password);
    // Return type is now void, which matches the AuthContextType
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
