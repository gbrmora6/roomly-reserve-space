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
      if (!user) {
        setIsLoading(false);
        return;
      }

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

        setIsProfileComplete(isComplete);
        
        // Se o perfil não está completo e não estamos na página de conta, redirecionar
        if (!isComplete && location.pathname !== '/my-account') {
          navigate('/my-account', { 
            replace: true,
            state: { 
              message: 'Por favor, complete seu perfil antes de continuar.',
              isFirstLogin: true 
            }
          });
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