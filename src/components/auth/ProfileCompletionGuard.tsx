import React from "react";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
}

const ProfileCompletionGuard: React.FC<ProfileCompletionGuardProps> = ({ children }) => {
  const { isProfileComplete, isLoading } = useProfileCompletion();
  const location = useLocation();

  // Páginas que sempre devem ser acessíveis
  const allowedPaths = ['/my-account', '/checkout', '/cart'];
  const isOnAllowedPath = allowedPaths.some(path => location.pathname.includes(path));

  // Se estamos numa página permitida, sempre renderizar os filhos
  if (isOnAllowedPath) {
    return <>{children}</>;
  }

  // Mostrar loading apenas se ainda estiver carregando E não for página permitida
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando perfil...</p>
        </div>
      </div>
    );
  }

  // Se não está carregando, sempre renderizar os filhos
  // O redirecionamento é feito pelo hook useProfileCompletion
  return <>{children}</>;
};

export default ProfileCompletionGuard;