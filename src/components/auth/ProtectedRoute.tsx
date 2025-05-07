
import React, { useEffect } from "react";
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

  // Refresh claims when component mounts and user is authenticated
  useEffect(() => {
    if (user && !loading) {
      console.log("ProtectedRoute - Refreshing user claims on initial mount");
      refreshUserClaims();
    }
  }, [user?.id, loading, refreshUserClaims]); // Only run when user ID changes or loading state changes

  // Debug auth state
  useEffect(() => {
    if (!loading) {
      console.log("ProtectedRoute - Auth state:", { authenticated: !!user, loading });
      if (user) {
        console.log("ProtectedRoute - User data:", { 
          id: user.id, 
          email: user.email,
          metadata: user.user_metadata,
          requiredRole
        });
      }
    }
  }, [user, loading, requiredRole]);

  // Show improved loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p className="text-muted-foreground text-sm">Verificando autenticação...</p>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    toast({
      variant: "destructive",
      title: "Acesso negado",
      description: "Você precisa estar logado para acessar esta página",
    });
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check if user is superAdmin, which bypasses all role checks
  const isSuperAdmin = 
    user.user_metadata?.is_super_admin === true || 
    user.email === "admin@example.com" || 
    user.email === "cpd@sapiens-psi.com.br";
  
  if (isSuperAdmin) {
    console.log("SuperAdmin detected - bypassing role checks");
    return <>{children}</>;
  }

  // Check role requirements using JWT claims
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
    
    // Simple permission check based on required role
    if (requiredRole === "admin" && !isAdmin) {
      console.error(`Acesso negado: Usuário não tem permissão de administrador`);
      
      toast({
        variant: "destructive",
        title: "Acesso restrito",
        description: `Você não tem permissão para acessar esta área. Acesso restrito para administradores.`,
      });
      return <Navigate to="/" replace />;
    } else if (requiredRole !== "admin" && requiredRole !== userRole) {
      console.error(`Acesso negado: Usuário tem papel ${userRole}, mas a página requer ${requiredRole}`);
      
      toast({
        variant: "destructive",
        title: "Acesso restrito",
        description: `Você não tem permissão para acessar esta área. Acesso restrito para ${requiredRole}.`,
      });
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
