import React, { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { devLog } from "@/utils/logger";

const Login: React.FC = () => {
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Log component state for debugging
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
      <MainLayout>
        <div className="container mx-auto flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Verificando autenticação...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Redirect based on user role
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
      // O redirecionamento acontecerá automaticamente quando o user state for atualizado
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Lado esquerdo: formulário */}
        <div className="flex-1 flex flex-col justify-center px-8 py-12 md:px-12">
          <div className="flex items-center gap-2 mb-8">
            <span className="bg-blue-100 rounded-full p-2">
              <svg width="32" height="32" fill="none" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#23406e"/><path d="M8 20V12a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 22v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <span className="font-extrabold text-2xl text-[#23406e]">Roomly</span>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-[#23406e]">Bem-vindo de volta!</h2>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            {loginError && (
              <div className="bg-red-100 text-red-700 rounded px-3 py-2 text-sm mb-2">{loginError}</div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                disabled={isLoading}
                autoComplete="email"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#23406e]"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#23406e]"
              />
            </div>
            <div className="flex items-center justify-between text-xs mb-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-gray-300" />
                Lembrar-me
              </label>
              <Link to="/forgot-password" className="text-[#23406e] hover:underline font-medium">Esqueceu sua senha?</Link>
            </div>
            <button
              type="submit"
              className="w-full bg-[#23406e] hover:bg-[#1a2e4d] text-white font-semibold text-base py-3 rounded-md transition"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Login"}
            </button>
            <div className="flex items-center my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="mx-3 text-gray-400 text-xs">Ou</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2 bg-white hover:bg-gray-50 font-medium text-gray-700"
              // onClick={handleGoogleLogin} // implementar se necessário
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Cadastre-se com o Google
            </button>
            <div className="text-center text-sm mt-4">
              Não tem uma conta? <Link to="/register" className="text-[#23406e] hover:underline font-medium">Cadastre-se</Link>
            </div>
          </form>
        </div>
        {/* Lado direito: ilustração */}
        <div className="hidden md:block md:w-1/2 bg-[#23406e] relative">
          <div className="absolute inset-0 flex flex-col items-center justify-center h-full w-full">
            {/* SVG decorativo ou imagem ilustrativa */}
            <svg width="260" height="260" fill="none" viewBox="0 0 260 260">
              <rect width="260" height="260" rx="32" fill="#1a2e4d" />
              <rect x="30" y="30" width="60" height="60" rx="12" fill="#23406e" />
              <rect x="110" y="30" width="120" height="40" rx="10" fill="#23406e" />
              <rect x="30" y="110" width="80" height="40" rx="10" fill="#23406e" />
              <rect x="130" y="110" width="60" height="60" rx="12" fill="#23406e" />
              <rect x="30" y="170" width="60" height="60" rx="12" fill="#23406e" />
              <rect x="110" y="190" width="120" height="40" rx="10" fill="#23406e" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
