import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthNavbar from "@/components/navbar/AuthNavbar";
import { toast } from "@/hooks/use-toast";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Por favor, digite seu email",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        throw error;
      }
      
      setEmailSent(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (error: any) {
      console.error("Erro ao enviar email de recuperação:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar email",
        description: error.message || "Ocorreu um erro ao tentar enviar o email de recuperação.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AuthNavbar showLoginButton={true} />
        <div className="flex min-h-screen items-center justify-center pt-16 px-4 sm:px-6">
          <div className="w-full max-w-md bg-white rounded-xl md:rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 text-primary">Email enviado!</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Enviamos um link de recuperação para <strong>{email}</strong>. 
                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
              </p>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="block w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 sm:py-3 rounded-md transition-all duration-300 shadow-lg hover:shadow-xl text-center text-sm sm:text-base"
                >
                  Voltar ao Login
                </Link>
                <button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                  className="block w-full text-primary hover:underline font-medium text-sm sm:text-base"
                >
                  Enviar para outro email
                </button>
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
      <div className="flex min-h-screen items-center justify-center pt-16 px-4 sm:px-6">
        <div className="w-full max-w-4xl bg-white rounded-xl md:rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
          {/* Lado esquerdo: formulário */}
          <div className="flex-1 flex flex-col justify-center px-6 py-8 sm:px-8 sm:py-12 md:px-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-primary">Esqueceu sua senha?</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6 md:mb-8">Digite seu email para receber um link de recuperação</p>
            
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu email"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 md:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-sm md:text-base py-2.5 md:py-3 rounded-md transition-all duration-300 shadow-lg hover:shadow-xl"
                disabled={isLoading}
              >
                {isLoading ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>
            
            <div className="text-center text-xs md:text-sm mt-4 md:mt-6">
              Lembrou da senha? <Link to="/login" className="text-primary hover:underline font-medium">Voltar ao login</Link>
            </div>
          </div>
          
          {/* Lado direito: ilustração */}
          <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-primary to-primary/80 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center h-full w-full p-6 lg:p-8">
              <div className="text-center text-white">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
                  <svg className="w-8 h-8 lg:w-10 lg:h-10" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h3 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-4">Recuperação Segura</h3>
                <p className="text-white/80 mb-4 lg:mb-6 text-sm lg:text-base">Enviaremos um link seguro para seu email para que você possa redefinir sua senha</p>
                <div className="space-y-2 lg:space-y-3 max-w-xs mx-auto">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2.5 lg:p-3 flex items-center gap-2 lg:gap-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-xs lg:text-sm">100% Seguro</div>
                      <div className="text-xs text-white/70">Processo criptografado</div>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2.5 lg:p-3 flex items-center gap-2 lg:gap-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-xs lg:text-sm">Link por Email</div>
                      <div className="text-xs text-white/70">Válido por 24 horas</div>
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

export default ForgotPassword;