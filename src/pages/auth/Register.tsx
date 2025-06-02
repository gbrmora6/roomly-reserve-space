
import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const Register: React.FC = () => {
  const { signUp, user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to="/rooms" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return;
    }
    setIsLoading(true);
    // Use uma branch padrão para novos registros
    await signUp(formData.email, formData.password, formData.firstName, formData.lastName, "default-branch-id");
    setIsLoading(false);
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
          <h2 className="text-2xl font-bold mb-2 text-[#23406e]">Crie sua conta</h2>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium mb-1">Nome</label>
                <input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Nome"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#23406e]"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-1">Sobrenome</label>
                <input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Sobrenome"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#23406e]"
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#23406e]"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">Senha</label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#23406e]"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">Confirmar senha</label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#23406e]"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#23406e] hover:bg-[#1a2e4d] text-white font-semibold text-base py-3 rounded-md transition"
              disabled={isLoading}
            >
              {isLoading ? "Criando conta..." : "Criar conta"}
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
              Já tem uma conta? <Link to="/login" className="text-[#23406e] hover:underline font-medium">Faça login</Link>
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

export default Register;
