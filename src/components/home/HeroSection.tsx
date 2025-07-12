import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, Clock } from "lucide-react";

interface HeroSectionProps {
  heroImageUrl: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({ heroImageUrl }) => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-gradient-to-r from-indigo-400/20 to-blue-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          >
            <Sparkles className="w-4 h-4 text-primary/30" />
          </div>
        ))}
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Content */}
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-gray-700">
                  Atendimento Psicológico Simplificado
                </span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight">
                <span className="block bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                  Psico
                </span>
                <span className="block mt-2 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent animate-pulse">
                  Flex
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Espaços completos para suas atividades relacionadas à psicologia com 
                ambientes preparados e equipamentos profissionais de última geração.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 py-8">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">50+</div>
                <div className="text-sm text-gray-600">Salas Disponíveis</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-sm text-gray-600">Disponibilidade</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">100%</div>
                <div className="text-sm text-gray-600">Satisfação</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                size="lg" 
                className="group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 px-8 py-4"
                onClick={() => navigate("/register")}
              >
                Comece Agora
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="group border-2 border-primary/20 text-primary hover:bg-primary/5 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-105 px-8 py-4"
                onClick={() => navigate("/rooms")}
              >
                <Clock className="mr-2 h-5 w-5" />
                Ver Disponibilidade
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="relative group">
              {/* 3D Card Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-400/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-700 transform group-hover:scale-110"></div>
              
              <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-2 shadow-2xl border border-white/20 transform transition-all duration-700 hover:scale-105 hover:rotate-1">
                <img
                  src={heroImageUrl}
                  alt="Ambiente profissional para psicólogos"
                  className="w-full h-96 md:h-[500px] object-cover rounded-2xl shadow-xl"
                />
                
                {/* Floating badge */}
                <div className="absolute -top-4 -right-4 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/30 transform rotate-6 hover:rotate-12 transition-transform duration-300">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">Novo</div>
                    <div className="text-xs text-gray-600">Equipamentos</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-10 -left-10 w-20 h-20 bg-gradient-to-br from-yellow-400/30 to-orange-400/30 rounded-full animate-bounce delay-1000"></div>
            <div className="absolute -bottom-10 -right-10 w-16 h-16 bg-gradient-to-br from-green-400/30 to-blue-400/30 rounded-full animate-bounce delay-2000"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;