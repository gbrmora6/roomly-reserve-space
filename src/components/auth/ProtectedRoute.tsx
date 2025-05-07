
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "client";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading, refreshUserClaims } = useAuth();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Verify authentication and permissions when component mounts
  useEffect(() => {
    const verifyAccess = async () => {
      if (loading) return;

      if (!user) {
        console.log("ProtectedRoute - No authenticated user found");
        setIsAuthorized(false);
        setAuthChecked(true);
        return;
      }

      try {
        // Always refresh claims when accessing protected routes to ensure we have the latest permissions
        console.log("ProtectedRoute - Refreshing user claims");
        await refreshUserClaims();
        
        // Check if user is superAdmin, which bypasses all role checks
        const isSuperAdmin = 
          user.user_metadata?.is_super_admin === true || 
          user.email === "admin@example.com" || 
          user.email === "cpd@sapiens-psi.com.br";
        
        if (isSuperAdmin) {
          console.log("SuperAdmin detected - bypassing role checks");
          setIsAuthorized(true);
          setAuthChecked(true);
          return;
        }

        // Check role requirements
        if (requiredRole) {
          const userRole = user.user_metadata?.role;
          const isAdmin = 
            user.user_metadata?.is_admin === true || 
            user.user_metadata?.role === "admin";
          
          console.log("Verificando permissões:", { 
            userRole, 
            requiredRole, 
            isAdmin,
            metadata: user.user_metadata
          });
          
          // Check if user has the required role
          if (requiredRole === "admin" && !isAdmin) {
            console.error(`Acesso negado: Usuário não tem permissão de administrador`);
            setIsAuthorized(false);
          } else if (requiredRole !== "admin" && requiredRole !== userRole) {
            console.error(`Acesso negado: Usuário tem papel ${userRole}, mas a página requer ${requiredRole}`);
            setIsAuthorized(false);
          } else {
            setIsAuthorized(true);
          }
        } else {
          // No specific role required, just authentication
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error("Error verifying user access:", error);
        setIsAuthorized(false);
      } finally {
        setAuthChecked(true);
      }
    };

    verifyAccess();
  }, [user, loading, requiredRole, refreshUserClaims, location.pathname]);

  // Show improved loading state
  if (loading || !authChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p className="text-muted-foreground text-sm">Verificando autenticação...</p>
      </div>
    );
  }

  // Handle unauthorized access
  if (!isAuthorized) {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você precisa estar logado para acessar esta página",
      });
      return <Navigate to="/login" replace state={{ from: location }} />;
    } else if (requiredRole) {
      toast({
        variant: "destructive",
        title: "Acesso restrito",
        description: `Você não tem permissão para acessar esta área. Acesso restrito para ${requiredRole === "admin" ? "administradores" : requiredRole}.`,
      });
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
