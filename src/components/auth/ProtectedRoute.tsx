
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

  // Enhanced debugging
  useEffect(() => {
    if (!loading) {
      console.log("ProtectedRoute - Auth state:", { authenticated: !!user, loading });
      if (user) {
        console.log("ProtectedRoute - User data:", { 
          id: user.id, 
          email: user.email,
          metadata: user.user_metadata,
          role: user.user_metadata?.role || "not set" 
        });
        
        // For admin routes, refresh the user claims to ensure latest admin status
        if (requiredRole === "admin") {
          refreshUserClaims();
        }
        
        console.log("ProtectedRoute - Required role:", requiredRole);
      }
    }
  }, [user, loading, requiredRole, refreshUserClaims]);

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

  // Check role requirements
  if (requiredRole) {
    const userRole = user.user_metadata?.role;
    const isAdmin = userRole === 'admin' || (user.user_metadata?.is_admin === true);
    
    console.log("Verificando permissões:", { 
      userRole, 
      requiredRole, 
      isAdmin,
      is_admin_claim: user.user_metadata?.is_admin,
      metadata: user.user_metadata
    });
    
    if (requiredRole === "admin" && !isAdmin) {
      console.error(`Access denied: User has role ${userRole}, but page requires admin`);
      
      toast({
        variant: "destructive",
        title: "Acesso restrito",
        description: `Você não tem permissão para acessar esta área. Acesso restrito para administradores.`,
      });
      return <Navigate to="/" replace />;
    } else if (requiredRole !== "admin" && requiredRole !== userRole) {
      console.error(`Access denied: User has role ${userRole}, but page requires ${requiredRole}`);
      
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
