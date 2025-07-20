import React from "react";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { Loader2 } from "lucide-react";

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
}

const ProfileCompletionGuard: React.FC<ProfileCompletionGuardProps> = ({ children }) => {
  const { isProfileComplete, isLoading } = useProfileCompletion();

  // Mostrar loading enquanto verifica o perfil
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

  // Se o perfil está completo ou ainda está carregando, renderizar os filhos
  // O redirecionamento é feito pelo hook useProfileCompletion
  return <>{children}</>;
};

export default ProfileCompletionGuard;