import React, { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthNavbar from "@/components/navbar/AuthNavbar";
import { toast } from "@/hooks/use-toast";
import { devLog } from "@/utils/logger";

const Login: React.FC = () => {
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    devLog("Login component - Auth state", { 
      userId: user?.id || null, 
      loading,
      userEmail: user?.email || null,
      userMeta: user?.user_metadata || null
    });
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AuthNavbar showRegisterButton={true} />
        <div className="flex min-h-screen items-center justify-center pt-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Verificando autenticação...</p>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    console.log("User is already logged in, checking role for redirect");
    const isAdmin = 
      user.user_metadata?.is_admin === true || 
      user.user_metadata?.role === "admin" ||
      user.email === "admin@example.com" ||
      user.email === "cpd@sapiens-psi.com.br";
    
    if (isAdmin) {
      console.log("Admin user detected, redirecting to /admin");
      return <Navigate to="/admin" replace />;
    } else {
      console.log("Regular user detected, redirecting to /rooms");
      return <Navigate to="/rooms" replace />;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha",
      });
      return;
    }
    
    setIsLoading(true);
    console.log("Attempting login with email:", email);
    
    try {
      await signIn(email, password);
      console.log("Login successful in Login component");
    } catch (error: any) {
      console.error("Login error in component:", error);
      
      let errorMessage = "Ocorreu um erro ao tentar fazer login. Verifique suas credenciais.";
      
      if (error.message && error.message.includes("Invalid login credentials")) {
        errorMessage = "Credenciais inválidas. Verifique seu email e senha.";
        setLoginError(errorMessage);
      } else if (error.message && error.message.includes("Email not confirmed")) {
        errorMessage = "Email não confirmado. Por favor, verifique seu email para ativar sua conta.";
        setLoginError(errorMessage);
      } else {
        setLoginError(error.message || errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <AuthNavbar showRegisterButton={true} />
      <div className="flex min-h-screen items-center justify-center pt-16 px-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
          <div className="flex-1 flex flex-col justify-center px-6 py-8 md:px-8 md:py-12 lg:px-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-primary">Bem-vindo de volta!</h2>
            <p className="text-sm md:text-base text-gray-600 mb-6 md:mb-8">Entre na sua conta</p>
            
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 mt-6">
              {loginError && (
                <div className="bg-red-100 text-red-700 rounded px-3 py-2 text-sm mb-2">{loginError}</div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-sm md:text-base"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-sm md:text-base"
                />
              </div>
              <div className="flex items-center justify-between text-xs md:text-sm mb-2 md:mb-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-gray-300" />
                  Lembrar-me
                </label>
                <Link to="/forgot-password" className="text-primary hover:underline font-medium">Esqueceu sua senha?</Link>
              </div>
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-sm md:text-base py-2 md:py-3 rounded-md transition-all duration-300 shadow-lg hover:shadow-xl"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Login"}
              </button>
              <div className="flex items-center my-3 md:my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="mx-3 text-gray-400 text-xs md:text-sm">Ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2 md:py-3 bg-white hover:bg-gray-50 font-medium text-gray-700 text-sm md:text-base"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                Cadastre-se com o Google
              </button>
              <div className="text-center text-xs md:text-sm mt-3 md:mt-4">
                Não tem uma conta? <Link to="/register" className="text-primary hover:underline font-medium">Cadastre-se</Link>
              </div>
            </form>
          </div>
          <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-primary to-primary/80 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center h-full w-full p-6 lg:p-8">
              <div className="text-center text-white">
                <h3 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-4">Gerencie seus espaços</h3>
                <p className="text-white/80 mb-6 lg:mb-8 text-sm lg:text-base">Reserve salas, equipamentos e produtos de forma simples e eficiente</p>
                <div className="grid grid-cols-2 gap-3 lg:gap-4 max-w-xs mx-auto">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 lg:p-4 text-center">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-white/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.84L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.84l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium">Salas</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 lg:p-4 text-center">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-white/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium">Equipamentos</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 lg:p-4 text-center">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-white/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium">Produtos</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 lg:p-4 text-center">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-white/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium">Reservas</span>
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

export default Login;
