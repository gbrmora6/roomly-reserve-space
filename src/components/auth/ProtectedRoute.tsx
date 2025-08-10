import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { devLog, errorLog } from "@/utils/logger";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "client" | "super_admin";
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  requireAdmin = false
}) => {
  const { user, loading, refreshUserClaims } = useAuth();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const verifyAccess = async () => {
      if (loading) return;

      if (!user) {
        devLog("ProtectedRoute - No authenticated user found");
        setIsAuthorized(false);
        setAuthChecked(true);
        return;
      }

      try {
        const role = user.user_metadata?.role;
        const isAdmin = role === "admin" || role === "super_admin";
        const effectiveRequiredRole = requireAdmin ? "admin" : requiredRole;
        if (effectiveRequiredRole && role !== effectiveRequiredRole) {
          setIsAuthorized(false);
          setAuthChecked(true);
          return;
        }
        if (requireAdmin && !isAdmin) {
          setIsAuthorized(false);
          setAuthChecked(true);
          return;
        }
        setIsAuthorized(true);
        setAuthChecked(true);
      } catch (err) {
        errorLog("Error verifying access in ProtectedRoute", err);
        setIsAuthorized(false);
        setAuthChecked(true);
      }
    };
    verifyAccess();
  }, [user, loading, requiredRole, requireAdmin, refreshUserClaims, location.pathname]);

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
    } else if (requireAdmin || requiredRole) {
      const roleDescription = requireAdmin || requiredRole === "admin" ? "administradores" : requiredRole;
      toast({
        variant: "destructive",
        title: "Acesso restrito",
        description: `Você não tem permissão para acessar esta área. Acesso restrito para ${roleDescription}.`,
      });
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
