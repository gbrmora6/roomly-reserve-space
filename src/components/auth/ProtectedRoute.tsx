
import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "client";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading } = useAuth();

  // Debug logs para identificar o problema
  useEffect(() => {
    if (user) {
      console.log("User authenticated:", user);
      console.log("User metadata:", user.user_metadata);
      console.log("Required role:", requiredRole);
    }
  }, [user, requiredRole]);

  // Aguardar a verificação de autenticação
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  // Verificar se o usuário está autenticado
  if (!user) {
    toast({
      variant: "destructive",
      title: "Acesso negado",
      description: "Você precisa estar logado para acessar esta página",
    });
    return <Navigate to="/login" replace />;
  }

  // Verificar role, se necessário
  if (requiredRole) {
    // Verificar a role nas user_metadata ou outros locais possíveis
    const userRole = user.user_metadata?.role || user.app_metadata?.role || null;
    
    console.log("User role detected:", userRole);
    
    if (userRole !== requiredRole) {
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
