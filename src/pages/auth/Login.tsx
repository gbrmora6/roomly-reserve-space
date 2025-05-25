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
    <MainLayout>
      <div className="container mx-auto flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Card className="border-2 border-roomly-200 shadow-lg">
            <CardHeader className="space-y-1 bg-gradient-to-r from-roomly-50 to-roomly-100 rounded-t-lg pb-4">
              <CardTitle className="text-2xl font-bold text-center text-roomly-800">Login</CardTitle>
              <CardDescription className="text-center text-roomly-600">
                Entre com suas credenciais para acessar sua conta
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-6">
                {loginError && (
                  <Alert variant="destructive">
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-medium text-roomly-700">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com" 
                    required 
                    disabled={isLoading}
                    autoComplete="email"
                    className="border-roomly-300 focus:border-roomly-500 focus:ring-roomly-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="font-medium text-roomly-700">Senha</Label>
                    <Link to="/forgot-password" className="text-sm text-roomly-600 hover:underline font-medium">
                      Esqueceu sua senha?
                    </Link>
                  </div>
                  <Input 
                    id="password" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="border-roomly-300 focus:border-roomly-500 focus:ring-roomly-500"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-2 pb-6">
                <Button 
                  type="submit" 
                  className="w-full bg-roomly-600 hover:bg-roomly-700 text-white font-medium text-base py-5"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full inline-block"></span>
                      Entrando...
                    </>
                  ) : "Login"}
                </Button>
                <div className="text-center text-sm">
                  Não tem uma conta?{" "}
                  <Link to="/register" className="text-roomly-600 hover:underline font-medium">
                    Cadastre-se
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Login;
