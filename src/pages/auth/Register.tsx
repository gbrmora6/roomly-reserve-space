import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthNavbar from "@/components/navbar/AuthNavbar";
import { usePasswordValidation } from "@/hooks/usePasswordValidation";
import { toast } from "@/hooks/use-toast";
const Register: React.FC = () => {
  const { signUp, user } = useAuth();
  const { validation, validatePassword } = usePasswordValidation();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  if (user) {
    return <Navigate to="/rooms" replace />;
  }
  const handlePasswordChange = (password: string) => {
    setFormData(prev => ({ ...prev, password }));
    validatePassword(password);
    setShowPasswordValidation(password.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password strength
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Senha inválida",
        description: "Por favor, corrija os problemas na senha antes de continuar.",
        variant: "destructive"
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, verifique se as senhas são idênticas.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      await signUp(formData.email, formData.password, formData.firstName, formData.lastName, "64a43fed-587b-415c-aeac-0abfd7867566");
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <AuthNavbar showLoginButton={true} />
      <div className="flex min-h-screen items-center justify-center pt-16 px-4 sm:px-6">
        <div className="w-full max-w-4xl bg-white rounded-xl md:rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
          {/* Lado esquerdo: formulário */}
          <div className="flex-1 flex flex-col justify-center px-6 py-8 sm:px-8 sm:py-12 md:px-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-primary">Crie sua conta</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6 md:mb-8">Preencha os dados para começar</p>
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4 mt-4 md:mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label htmlFor="firstName" className="block text-xs sm:text-sm font-medium mb-1">Nome</label>
                <input id="firstName" value={formData.firstName} onChange={e => setFormData(prev => ({
                  ...prev,
                  firstName: e.target.value
                }))} placeholder="Nome" required className="w-full rounded-md border border-gray-300 px-3 py-2 md:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200" />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-xs sm:text-sm font-medium mb-1">Sobrenome</label>
                <input id="lastName" value={formData.lastName} onChange={e => setFormData(prev => ({
                  ...prev,
                  lastName: e.target.value
                }))} placeholder="Sobrenome" required className="w-full rounded-md border border-gray-300 px-3 py-2 md:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200" />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium mb-1">Email</label>
              <input id="email" type="email" value={formData.email} onChange={e => setFormData(prev => ({
                ...prev,
                email: e.target.value
              }))} placeholder="Email" required className="w-full rounded-md border border-gray-300 px-3 py-2 md:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200" />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium mb-1">Senha</label>
              <input 
                id="password" 
                type="password" 
                value={formData.password} 
                onChange={e => handlePasswordChange(e.target.value)}
                required 
                className="w-full rounded-md border border-gray-300 px-3 py-2 md:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200" 
              />
              {showPasswordValidation && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-full h-1 rounded-full ${
                      validation.strength === 'weak' ? 'bg-red-200' :
                      validation.strength === 'medium' ? 'bg-yellow-200' :
                      'bg-green-200'
                    }`}>
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        validation.strength === 'weak' ? 'w-1/3 bg-red-500' :
                        validation.strength === 'medium' ? 'w-2/3 bg-yellow-500' :
                        'w-full bg-green-500'
                      }`} />
                    </div>
                    <span className={`text-xs font-medium ${
                      validation.strength === 'weak' ? 'text-red-600' :
                      validation.strength === 'medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {validation.strength === 'weak' ? 'Fraca' :
                       validation.strength === 'medium' ? 'Média' : 'Forte'}
                    </span>
                  </div>
                  {validation.errors.length > 0 && (
                    <ul className="text-xs text-red-600 space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <span className="text-red-500">•</span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium mb-1">Confirmar senha</label>
              <input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={e => setFormData(prev => ({
                ...prev,
                confirmPassword: e.target.value
              }))} required className="w-full rounded-md border border-gray-300 px-3 py-2 md:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200" />
            </div>
            <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-sm md:text-base py-2.5 md:py-3 rounded-md transition-all duration-300 shadow-lg hover:shadow-xl" disabled={isLoading}>
              {isLoading ? "Criando conta..." : "Criar conta"}
            </button>
            <div className="flex items-center my-3 md:my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="mx-3 text-gray-400 text-xs">Ou</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            
            <div className="text-center text-xs md:text-sm mt-3 md:mt-4">
              Já tem uma conta? <Link to="/login" className="text-primary hover:underline font-medium">Faça login</Link>
            </div>
          </form>
        </div>
        {/* Lado direito: ilustração */}
        <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-primary to-primary/80 relative">
          <div className="absolute inset-0 flex flex-col items-center justify-center h-full w-full p-6 lg:p-8">
            <div className="text-center text-white">
              <h3 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-4">Junte-se a nós</h3>
              <p className="text-white/80 mb-6 lg:mb-8 text-sm lg:text-base">Tenha acesso completo a todos os recursos da plataforma</p>
              <div className="space-y-3 lg:space-y-4 max-w-xs mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 lg:p-4 flex items-center gap-2 lg:gap-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-xs lg:text-sm">Reservas Ilimitadas</div>
                    <div className="text-xs text-white/70">Reserve quantas vezes precisar</div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 lg:p-4 flex items-center gap-2 lg:gap-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-xs lg:text-sm">Histórico Completo</div>
                    <div className="text-xs text-white/70">Acompanhe todas suas atividades</div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 lg:p-4 flex items-center gap-2 lg:gap-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-xs lg:text-sm">Suporte Prioritário</div>
                    <div className="text-xs text-white/70">Atendimento especializado</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>;
};
export default Register;