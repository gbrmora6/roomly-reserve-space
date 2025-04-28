
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

const Login: React.FC = () => {
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Login component - Auth state:", { user: user?.id || null, loading });
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

  if (user) {
    console.log("User is already logged in, redirecting to /rooms");
    return <Navigate to="/rooms" replace />;
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
      console.log("Login successful");
      // No need to redirect here as the AuthProvider will handle it
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message || "Falha na autenticação. Verifique suas credenciais.");
      
      let errorMessage = "Ocorreu um erro ao tentar fazer login. Verifique suas credenciais.";
      
      if (error.message && error.message.includes("Invalid login credentials")) {
        errorMessage = "Credenciais inválidas. Verifique seu email e senha.";
      } else if (error.message && error.message.includes("Email not confirmed")) {
        errorMessage = "Email não confirmado. Por favor, verifique seu email para ativar sua conta.";
      }
      
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
              <CardDescription className="text-center">
                Entre com suas credenciais para acessar sua conta
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {loginError && (
                  <Alert variant="destructive">
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com" 
                    required 
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <Link to="/forgot-password" className="text-sm text-roomly-600 hover:underline">
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
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full bg-roomly-600 hover:bg-roomly-700"
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
                  <Link to="/register" className="text-roomly-600 hover:underline">
                    Cadastre-se
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Credenciais de teste:</p>
            <p>Cliente: client@example.com / password</p>
            <p>Admin: admin@example.com / password</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Login;
