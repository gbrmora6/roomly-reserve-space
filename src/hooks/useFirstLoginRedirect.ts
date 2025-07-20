import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { devLog } from '@/utils/logger';

export function useFirstLoginRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    const checkFirstLogin = async () => {
      try {
        // Verificar se o usuário tem um perfil completo
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone, specialty, created_at')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          devLog('Erro ao verificar perfil do usuário:', error);
          return;
        }

        // Se não tem perfil ou perfil está incompleto
        const isProfileIncomplete = !profile || 
          !profile.first_name || 
          !profile.last_name || 
          !profile.phone || 
          !profile.specialty;

        // Verificar se é um login recente (criado há menos de 5 minutos)
        const isRecentUser = profile && profile.created_at && 
          (new Date().getTime() - new Date(profile.created_at).getTime()) < 5 * 60 * 1000;

        // Se o perfil está incompleto e é um usuário recente, e não está já na página my-account
        if (isProfileIncomplete && isRecentUser && location.pathname !== '/my-account') {
          devLog('Redirecionando usuário para completar perfil');
          navigate('/my-account', {
            state: {
              isFirstLogin: true,
              message: 'Para começar a usar o Roomly, complete seu perfil com suas informações pessoais.'
            }
          });
        }
      } catch (error) {
        devLog('Erro ao verificar primeiro login:', error);
      }
    };

    // Aguardar um pouco para garantir que o usuário foi carregado completamente
    const timer = setTimeout(checkFirstLogin, 1000);

    return () => clearTimeout(timer);
  }, [user, navigate, location.pathname]);
}