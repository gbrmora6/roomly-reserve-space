
import React from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const Login: React.FC = () => {
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
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link to="/forgot-password" className="text-sm text-roomly-600 hover:underline">
                    Esqueceu sua senha?
                  </Link>
                </div>
                <Input id="password" type="password" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button className="w-full bg-roomly-600 hover:bg-roomly-700">Login</Button>
              <div className="text-center text-sm">
                Não tem uma conta?{" "}
                <Link to="/register" className="text-roomly-600 hover:underline">
                  Cadastre-se
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Login;
