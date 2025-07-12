import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, Clock, User, Sparkles, Shield, Star, Award, Target } from "lucide-react";
import HeroSection from "@/components/home/HeroSection";
import StatsSection from "@/components/home/StatsSection";

const Index: React.FC = () => {
  const navigate = useNavigate();
  const [heroImageUrl, setHeroImageUrl] = useState<string>("https://fgiidcdsvmqxdkclgety.supabase.co/storage/v1/object/public/site-photos//inicial.jpg");

  useEffect(() => {
    setHeroImageUrl("https://fgiidcdsvmqxdkclgety.supabase.co/storage/v1/object/public/site-photos//inicial.jpg");
  }, []);

  return (
    <MainLayout>
      <HeroSection heroImageUrl={heroImageUrl} />
      
      <StatsSection />

      {/* Modern Services Section */}
      <section className="py-20 bg-gradient-to-br from-background to-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-white/60 shadow-lg mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Nossos Serviços</span>
            </div>
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Soluções Completas para <span className="text-primary">Psicólogos</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Oferecemos tudo o que você precisa para realizar seus atendimentos com excelência
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Salas Especializadas",
                description: "Ambientes com isolamento acústico e mobiliário adequado",
                icon: <User className="w-8 h-8" />,
                color: "from-blue-500 to-blue-600",
                bgColor: "from-blue-50 to-blue-100"
              },
              {
                title: "Materiais para Testes",
                description: "Biblioteca completa de testes psicológicos e materiais",
                icon: <CheckCircle className="w-8 h-8" />,
                color: "from-green-500 to-green-600",
                bgColor: "from-green-50 to-green-100"
              },
              {
                title: "Equipamentos Premium",
                description: "Recursos tecnológicos de última geração",
                icon: <Target className="w-8 h-8" />,
                color: "from-purple-500 to-purple-600",
                bgColor: "from-purple-50 to-purple-100"
              },
              {
                title: "Agendamento Flexível",
                description: "Sistema inteligente de reservas por hora",
                icon: <Calendar className="w-8 h-8" />,
                color: "from-orange-500 to-orange-600",
                bgColor: "from-orange-50 to-orange-100"
              }
            ].map((service, index) => (
              <div
                key={index}
                className="group relative animate-float"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${service.bgColor} rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-700 opacity-60 group-hover:opacity-80`}></div>
                
                <div className="relative bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-700 border border-white/60 group-hover:border-white/80 h-full">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} text-white mb-4 shadow-lg group-hover:shadow-xl transition-all duration-500 group-hover:scale-110`}>
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">
                    {service.description}
                  </p>
                  
                  <div className={`mt-4 h-1 w-8 bg-gradient-to-r ${service.color} rounded-full transition-all duration-500 group-hover:w-12`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Steps Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Como Funciona</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Processo simples e rápido para você focar no que realmente importa
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
            {[
              {
                step: "01",
                title: "Cadastre-se",
                description: "Crie sua conta gratuita em poucos minutos",
                icon: <User className="h-6 w-6" />
              },
              {
                step: "02", 
                title: "Escolha uma sala",
                description: "Encontre o espaço ideal para seu atendimento",
                icon: <Target className="h-6 w-6" />
              },
              {
                step: "03",
                title: "Reserve",
                description: "Selecione data, horário e confirme sua reserva",
                icon: <Calendar className="h-6 w-6" />
              },
              {
                step: "04",
                title: "Atenda",
                description: "Chegue e aproveite nosso espaço preparado",
                icon: <CheckCircle className="h-6 w-6" />
              }
            ].map((step, index) => (
              <div key={index} className="relative group">
                {index < 3 && (
                  <div className="absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent -z-10 hidden md:block" />
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                    <span className="text-xl font-bold text-white">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modern CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-bold mb-4">Pronto para Começar?</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-10">
            Cadastre-se agora e tenha acesso a espaços preparados para sua prática profissional
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90 transition-all duration-300 transform hover:scale-105 min-w-[200px] shadow-lg"
              onClick={() => navigate("/register")}
            >
              Criar uma Conta
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10 transition-all duration-300 transform hover:scale-105 min-w-[200px]"
              onClick={() => navigate("/rooms")}
            >
              Ver Salas
            </Button>
          </div>
        </div>
      </section>
      
      {/* Modern Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">O Que Dizem Nossos Clientes</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Profissionais que confiam em nossos espaços para seus atendimentos
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                name: "Ana Silva",
                role: "Psicóloga Clínica",
                testimonial: "As salas são excelentes, com ótimo isolamento acústico e móveis confortáveis. Perfeito para meus atendimentos."
              },
              {
                name: "Carlos Mendes", 
                role: "Neuropsicólogo",
                testimonial: "Os equipamentos disponíveis facilitam muito meu trabalho. Recomendo para todos os profissionais da área."
              },
              {
                name: "Maria Oliveira",
                role: "Psicanalista", 
                testimonial: "A flexibilidade de horários é o que mais me atrai. Posso agendar apenas o tempo que preciso, sem desperdícios."
              }
            ].map((testimonial, index) => (
              <div
                key={index}
                className="group rounded-2xl bg-white/70 backdrop-blur-sm p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-white/60 hover:border-white/80 animate-float"
                style={{ animationDelay: `${index * 0.3}s` }}
              >
                <div className="flex flex-col h-full">
                  <div className="mb-4">
                    <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>
                  <p className="flex-grow text-muted-foreground italic mb-6 text-lg leading-relaxed">
                    "{testimonial.testimonial}"
                  </p>
                  <div>
                    <h4 className="font-semibold text-foreground text-lg">{testimonial.name}</h4>
                    <p className="text-primary font-medium">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
