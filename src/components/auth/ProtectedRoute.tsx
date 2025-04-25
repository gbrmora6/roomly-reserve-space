
import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "client";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
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
        console.log("ProtectedRoute - Required role:", requiredRole);
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

  // Check role requirements
  if (requiredRole) {
    const userRole = user.user_metadata?.role;
    
    if (userRole !== requiredRole) {
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
