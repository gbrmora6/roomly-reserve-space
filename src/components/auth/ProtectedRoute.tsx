
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

  // Debugging para diagnóstico
  useEffect(() => {
    if (!loading && user) {
      console.log("ProtectedRoute - User metadata:", user.user_metadata);
      console.log("ProtectedRoute - Required role:", requiredRole);
      console.log("ProtectedRoute - Current path:", location.pathname);
    }
  }, [user, loading, requiredRole, location]);

  // Mostrar spinner durante o carregamento
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // Verificar se o usuário está autenticado
  if (!user) {
    toast({
      variant: "destructive",
      title: "Acesso negado",
      description: "Você precisa estar logado para acessar esta página",
    });
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Verificar a role, se necessário
  if (requiredRole) {
    // Tentar obter a role do user_metadata ou do objeto user diretamente
    const userRole = user.user_metadata?.role;
    
    if (userRole !== requiredRole) {
      console.error(`Acesso negado: Usuário tem role ${userRole}, mas a página requer ${requiredRole}`);
      
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
