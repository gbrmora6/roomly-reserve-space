
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

export const useProfileCompletion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      console.log("=== VERIFICANDO PERFIL ===");
      console.log("Usuário:", !!user);
      console.log("Localização atual:", location.pathname);

      if (!user) {
        console.log("Sem usuário, finalizando verificação");
        setIsProfileComplete(null);
        setIsLoading(false);
        return;
      }

      // Páginas onde permitimos acesso mesmo com perfil incompleto
      const allowedPaths = ['/my-account', '/checkout', '/cart'];
      const isOnAllowedPath = allowedPaths.some(path => location.pathname.includes(path));
      
      console.log("Está em página permitida:", isOnAllowedPath);

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone, specialty, cep, state, city, neighborhood, street, house_number')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erro ao verificar perfil:', error);
          setIsProfileComplete(false);
          setIsLoading(false);
          return;
        }

        // Verificar se os campos obrigatórios estão preenchidos
        const requiredFields = [
          'first_name',
          'last_name', 
          'phone',
          'specialty',
          'cep',
          'state',
          'city',
          'neighborhood',
          'street',
          'house_number'
        ];

        const isComplete = requiredFields.every(field => {
          const value = profile[field as keyof typeof profile];
          return value && value.toString().trim().length > 0;
        });

        console.log("Perfil completo:", isComplete);
        console.log("Campos faltando:", requiredFields.filter(field => {
          const value = profile[field as keyof typeof profile];
          return !value || value.toString().trim().length === 0;
        }));

        setIsProfileComplete(isComplete);
        
        // IMPORTANTE: Só redirecionar se:
        // 1. O perfil não está completo
        // 2. NÃO estamos numa página permitida
        // 3. NÃO estamos já indo para /my-account
        if (!isComplete && !isOnAllowedPath && location.pathname !== '/my-account') {
          console.log("Redirecionando para completar perfil");
          navigate('/my-account', { 
            replace: true,
            state: { 
              message: 'Por favor, complete seu perfil antes de continuar.',
              isFirstLogin: true 
            }
          });
        } else {
          console.log("Não redirecionando - condições não atendidas");
        }
        
      } catch (error) {
        console.error('Erro ao verificar completude do perfil:', error);
        setIsProfileComplete(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkProfileCompletion();
  }, [user, navigate, location.pathname]);

  return {
    isProfileComplete,
    isLoading
  };
};
