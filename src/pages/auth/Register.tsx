
import React from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const Register: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Criar conta</CardTitle>
              <CardDescription className="text-center">
                Preencha os dados abaixo para criar sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input id="firstName" placeholder="João" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input id="lastName" placeholder="Silva" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input id="confirmPassword" type="password" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button className="w-full bg-roomly-600 hover:bg-roomly-700">Criar conta</Button>
              <div className="text-center text-sm">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-roomly-600 hover:underline">
                  Faça login
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Register;
