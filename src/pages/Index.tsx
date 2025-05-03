
import React from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, CheckCircle, Clock, HelpCircle, User } from "lucide-react";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";

const Index: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      {/* Hero Section - Updated with gradient and better styling */}
      <section className="relative bg-gradient-to-r from-blue-50 to-indigo-50 py-20 md:py-28">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158')] bg-cover opacity-5"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="text-center md:text-left">
              <span className="inline-block mb-4 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-roomly-600">
                Atendimento Psicológico Simplificado
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
                <span className="block">Psico</span>
                <span className="block mt-1 text-roomly-600">Flex</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 max-w-md mx-auto md:mx-0">
                Espaços completos para suas atividades relacionadas à psicologia com ambientes preparados e equipamentos profissionais.
              </p>
              <div className="mt-10 flex flex-col justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0 md:justify-start">
                <Button 
                  size="lg" 
                  className="bg-roomly-600 hover:bg-roomly-700 transition-all duration-300 transform hover:scale-105"
                  onClick={() => navigate("/register")}
                >
                  Comece agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-roomly-500 border-2 text-roomly-700 hover:bg-roomly-50 transition-all duration-300 transform hover:scale-105"
                  onClick={() => navigate("/rooms")}
                >
                  Ver salas disponíveis
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="rounded-lg overflow-hidden shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d"
                  alt="Reserva de salas para psicólogos"
                  className="h-auto w-full object-cover"
                  width={600}
                  height={400}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Menu Section - New interactive element */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-white hover:bg-gray-50">
                    Serviços
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {[
                        {
                          title: "Salas Especializadas",
                          desc: "Ambientes preparados para atendimento psicológico"
                        },
                        {
                          title: "Materiais para Testes",
                          desc: "Acesso a materiais e testes psicológicos necessários"
                        },
                        {
                          title: "Equipamentos Completos",
                          desc: "Recursos para suas sessões terapêuticas"
                        },
                        {
                          title: "Agendamento Flexível",
                          desc: "Reserve apenas o tempo que precisa utilizar"
                        }
                      ].map((item) => (
                        <NavigationMenuLink 
                          key={item.title} 
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">{item.title}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{item.desc}</p>
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

      {/* Features Section - Updated with icons and better styling */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Por que escolher a Psico Flex?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Oferecemos tudo o que você precisa para realizar seus atendimentos psicológicos com excelência.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Salas Especializadas",
                description: "Ambientes preparados para atendimento psicológico, com isolamento acústico e mobiliário adequado.",
                icon: <User className="h-10 w-10 text-roomly-600" />
              },
              {
                title: "Atendimento Flexível",
                description: "Reserve suas salas por hora, meio período ou dia inteiro, de acordo com sua necessidade.",
                icon: <Clock className="h-10 w-10 text-roomly-600" />
              },
              {
                title: "Equipamentos Completos",
                description: "Infraestrutura completa com equipamentos e recursos para suas sessões terapêuticas.",
                icon: <CheckCircle className="h-10 w-10 text-roomly-600" />
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:border-roomly-200 hover:-translate-y-1"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-roomly-50">
                  {feature.icon}
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
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
