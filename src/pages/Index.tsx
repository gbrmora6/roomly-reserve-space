import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, CheckCircle, Clock, HelpCircle, User, Sparkles, Shield, Star, Users, Award, Target } from "lucide-react";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { supabase } from "@/integrations/supabase/client";
import HeroSection from "@/components/home/HeroSection";
import StatsSection from "@/components/home/StatsSection";

const Index: React.FC = () => {
  const navigate = useNavigate();
  const [heroImageUrl, setHeroImageUrl] = useState<string>("https://fgiidcdsvmqxdkclgety.supabase.co/storage/v1/object/public/site-photos//inicial.jpg");

  // Fetch hero image from Supabase storage
  useEffect(() => {
    setHeroImageUrl("https://fgiidcdsvmqxdkclgety.supabase.co/storage/v1/object/public/site-photos//inicial.jpg");
  }, []);

  return (
    <MainLayout>
      <HeroSection heroImageUrl={heroImageUrl} />
      
      <StatsSection />

      {/* Interactive Services Section */}
      <section className="py-20 bg-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-purple-500 to-primary"></div>
        
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Nossos Serviços</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Descubra todas as soluções que oferecemos para profissionais da psicologia
            </p>
          </div>

          <div className="flex justify-center">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-white hover:bg-gray-50 text-lg px-6 py-3 shadow-lg border border-gray-200 rounded-xl">
                    Explore Nossos Serviços
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[600px] gap-4 p-6 md:w-[700px] md:grid-cols-2 lg:w-[800px]">
                      {[
                        {
                          title: "Salas Especializadas",
                          desc: "Ambientes preparados com isolamento acústico e mobiliário adequado para atendimento psicológico",
                          icon: <User className="w-6 h-6 text-primary" />
                        },
                        {
                          title: "Materiais para Testes",
                          desc: "Acesso a biblioteca completa de testes psicológicos e materiais de avaliação",
                          icon: <CheckCircle className="w-6 h-6 text-green-500" />
                        },
                        {
                          title: "Equipamentos Completos",
                          desc: "Recursos tecnológicos e equipamentos especializados para suas sessões",
                          icon: <Target className="w-6 h-6 text-blue-500" />
                        },
                        {
                          title: "Agendamento Flexível",
                          desc: "Sistema inteligente de reservas por hora, meio período ou dia inteiro",
                          icon: <Calendar className="w-6 h-6 text-purple-500" />
                        }
                      ].map((service, index) => (
                        <NavigationMenuLink 
                          key={service.title} 
                          className="group block select-none space-y-3 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50 hover:shadow-lg border border-gray-100 hover:border-primary/20"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-white transition-colors duration-300">
                              {service.icon}
                            </div>
                            <div className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors duration-300">
                              {service.title}
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                            {service.desc}
                          </p>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>
      </section>

      {/* Modern Features Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-200/30 to-pink-200/30 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-white/60 shadow-lg mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-gray-700">Diferenciais Únicos</span>
            </div>
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Por que escolher a <span className="text-primary">PsicoFlex</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Oferecemos tudo o que você precisa para realizar seus atendimentos psicológicos 
              com excelência e comodidade
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Salas Especializadas",
                description: "Ambientes preparados para atendimento psicológico, com isolamento acústico perfeito e mobiliário ergonômico de qualidade premium.",
                icon: <User className="h-8 w-8" />,
                color: "from-blue-500 to-blue-600",
                bgColor: "from-blue-50 to-blue-100"
              },
              {
                title: "Horários Flexíveis",
                description: "Reserve suas salas por hora, meio período ou dia inteiro. Sistema de agendamento inteligente que se adapta à sua rotina.",
                icon: <Clock className="h-8 w-8" />,
                color: "from-green-500 to-green-600",
                bgColor: "from-green-50 to-green-100"
              },
              {
                title: "Equipamentos Premium",
                description: "Infraestrutura completa com equipamentos de última geração e recursos tecnológicos para suas sessões terapêuticas.",
                icon: <Award className="h-8 w-8" />,
                color: "from-purple-500 to-purple-600",
                bgColor: "from-purple-50 to-purple-100"
              },
              {
                title: "Suporte 24/7",
                description: "Equipe especializada disponível round the clock para garantir que tudo funcione perfeitamente em seus atendimentos.",
                icon: <Shield className="h-8 w-8" />,
                color: "from-red-500 to-red-600",
                bgColor: "from-red-50 to-red-100"
              },
              {
                title: "Localização Premium",
                description: "Filiais em pontos estratégicos da cidade, com fácil acesso e estacionamento amplo para você e seus pacientes.",
                icon: <Star className="h-8 w-8" />,
                color: "from-yellow-500 to-yellow-600",
                bgColor: "from-yellow-50 to-yellow-100"
              },
              {
                title: "Preços Justos",
                description: "Tarifas transparentes e competitivas, com planos especiais para profissionais que utilizam nossos espaços regularmente.",
                icon: <CheckCircle className="h-8 w-8" />,
                color: "from-indigo-500 to-indigo-600",
                bgColor: "from-indigo-50 to-indigo-100"
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative transform transition-all duration-700 hover:scale-105 hover:-translate-y-2"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgColor} rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-700 opacity-60 group-hover:opacity-80`}></div>
                
                <div className="relative bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-700 border border-white/60 group-hover:border-white/80">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} text-white mb-6 shadow-lg group-hover:shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-primary transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                    {feature.description}
                  </p>
                  
                  {/* Decorative gradient line */}
                  <div className={`mt-6 h-1 w-12 bg-gradient-to-r ${feature.color} rounded-full transition-all duration-500 group-hover:w-16`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section - New section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Como funciona</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Simplificamos o processo para você focar no que realmente importa: seus pacientes.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
            {[
              {
                step: "01",
                title: "Cadastre-se",
                description: "Crie sua conta gratuita em poucos minutos.",
                icon: <User className="h-6 w-6 text-white" />
              },
              {
                step: "02",
                title: "Escolha uma sala",
                description: "Encontre o espaço ideal para seu atendimento.",
                icon: <HelpCircle className="h-6 w-6 text-white" />
              },
              {
                step: "03",
                title: "Reserve",
                description: "Selecione data, horário e confirme sua reserva.",
                icon: <Calendar className="h-6 w-6 text-white" />
              },
              {
                step: "04",
                title: "Atenda",
                description: "Chegue 15 minutos antes e aproveite nosso espaço.",
                icon: <CheckCircle className="h-6 w-6 text-white" />
              }
            ].map((step, index) => (
              <div key={index} className="relative">
                {index < 3 && (
                  <div className="absolute top-10 left-full w-full h-0.5 bg-roomly-200 -z-10 hidden md:block" />
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-roomly-500 to-roomly-600 mb-4">
                    <span className="text-xl font-bold text-white">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Updated with better styling */}
      <section className="py-16 bg-gradient-to-r from-roomly-600 to-roomly-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Pronto para começar?</h2>
          <p className="mx-auto mt-4 max-w-2xl">
            Cadastre-se agora e tenha acesso a espaços preparados para sua prática profissional.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-roomly-600 hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 min-w-[200px]"
              onClick={() => navigate("/register")}
            >
              Criar uma conta
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-roomly-500 transition-all duration-300 transform hover:scale-105 min-w-[200px]"
              onClick={() => navigate("/rooms")}
            >
              Ver salas
            </Button>
          </div>
        </div>
      </section>
      
      {/* Testimonials - New section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">O que dizem nossos clientes</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Profissionais que confiam em nossos espaços para seus atendimentos.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                name: "Ana Silva",
                role: "Psicóloga Clínica",
                testimonial: "As salas são excelentes, com ótimo isolamento acústico e móveis confortáveis. Perfeito para meus atendimentos.",
              },
              {
                name: "Carlos Mendes",
                role: "Neuropsicólogo",
                testimonial: "Os equipamentos disponíveis facilitam muito meu trabalho. Recomendo para todos os profissionais da área.",
              },
              {
                name: "Maria Oliveira",
                role: "Psicanalista",
                testimonial: "A flexibilidade de horários é o que mais me atrai. Posso agendar apenas o tempo que preciso, sem desperdícios.",
              }
            ].map((testimonial, index) => (
              <div
                key={index}
                className="rounded-xl bg-white p-8 shadow-sm transition-all hover:shadow-md border border-gray-100"
              >
                <div className="flex flex-col h-full">
                  <div className="mb-4">
                    <svg className="h-6 w-6 text-roomly-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>
                  <p className="flex-grow text-gray-600 italic mb-6">{testimonial.testimonial}</p>
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
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
