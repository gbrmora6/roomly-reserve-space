import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthNavbar from "@/components/navbar/AuthNavbar";
import { toast } from "@/hooks/use-toast";

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkToken = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (!error) {
            setIsValidToken(true);
          } else {
            console.error('Erro ao validar token:', error);
            toast({
              variant: "destructive",
              title: "Link inválido",
              description: "O link de recuperação é inválido ou expirou.",
            });
          }
        } catch (error) {
          console.error('Erro ao processar token:', error);
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Ocorreu um erro ao processar o link de recuperação.",
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Link inválido",
          description: "O link de recuperação é inválido ou expirou.",
        });
      }
      
      setIsCheckingToken(false);
    };

    checkToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas não coincidem",
        description: "As senhas digitadas não são iguais",
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Senha redefinida!",
        description: "Sua senha foi alterada com sucesso. Você será redirecionado para o login.",
      });
      
      // Aguarda um pouco antes de redirecionar
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      toast({
        variant: "destructive",
        title: "Erro ao redefinir senha",
        description: error.message || "Ocorreu um erro ao tentar redefinir sua senha.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AuthNavbar showLoginButton={true} />
        <div className="flex min-h-screen items-center justify-center pt-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Verificando link de recuperação...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AuthNavbar showLoginButton={true} />
        <div className="flex min-h-screen items-center justify-center pt-16 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900">Link inválido</h2>
              <p className="text-gray-600 mb-6">
                O link de recuperação é inválido ou expirou. 
                Solicite um novo link de recuperação.
              </p>
              <div className="space-y-3">
                <Link
                  to="/forgot-password"
                  className="block w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-md transition-all duration-300 shadow-lg hover:shadow-xl text-center"
                >
                  Solicitar novo link
                </Link>
                <Link
                  to="/login"
                  className="block w-full text-primary hover:underline font-medium"
                >
                  Voltar ao login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <AuthNavbar showLoginButton={true} />
      <div className="flex min-h-screen items-center justify-center pt-16 px-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
          {/* Lado esquerdo: formulário */}
          <div className="flex-1 flex flex-col justify-center px-8 py-12 md:px-12">
            <h2 className="text-3xl font-bold mb-2 text-primary">Nova senha</h2>
            <p className="text-gray-600 mb-8">Digite sua nova senha</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">Nova senha</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">Confirmar nova senha</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-base py-3 rounded-md transition-all duration-300 shadow-lg hover:shadow-xl"
                disabled={isLoading}
              >
                {isLoading ? "Redefinindo..." : "Redefinir senha"}
              </button>
            </form>
            
            <div className="text-center text-sm mt-6">
              <Link to="/login" className="text-primary hover:underline font-medium">Voltar ao login</Link>
            </div>
          </div>
          
          {/* Lado direito: ilustração */}
          <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-primary to-primary/80 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center h-full w-full p-8">
              <div className="text-center text-white">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4">Quase pronto!</h3>
                <p className="text-white/80 mb-6">Defina uma nova senha segura para sua conta</p>
                <div className="space-y-3 max-w-xs mx-auto">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-sm">Mínimo 6 caracteres</div>
                      <div className="text-xs text-white/70">Para maior segurança</div>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-sm">Criptografia avançada</div>
                      <div className="text-xs text-white/70">Dados protegidos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;