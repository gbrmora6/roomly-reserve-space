import React from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Index: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-blue-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
                Bem-vindo ao <span className="text-roomly-600">EspaçoPsic</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600">
                Sala completa para suas atividades relacionadas a psicologia com teste e equipamentos preparados para você.
              </p>
              <div className="mt-8 flex flex-col justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0 md:justify-start">
                <Button 
                  size="lg" 
                  className="bg-roomly-600 hover:bg-roomly-700"
                  onClick={() => navigate("/register")}
                >
                  Comece agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate("/rooms")}
                >
                  Ver salas disponíveis
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="overflow-hidden rounded-lg shadow-xl">
                <img
                  src="https://fgiidcdsvmqxdkclgety.supabase.co/storage/v1/object/public/site-photos//inicial.jpg"
                  alt="Sistema de reserva de salas"
                  className="h-auto w-full"
                  width={600}
                  height={400}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Recursos principais</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Tudo o que você precisa para realizar seus atendimentos psicológicos com excelência.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Salas Especializadas",
                description: "Ambientes preparados para atendimento psicológico, com isolamento acústico e mobiliário adequado.",
              },
              {
                title: "Materiais para Testes",
                description: "Acesso a materiais e testes psicológicos necessários para sua prática profissional.",
              },
              {
                title: "Equipamentos Completos",
                description: "Infraestrutura completa com equipamentos e recursos para suas sessões terapêuticas.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <h3 className="mb-3 text-xl font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-roomly-600 py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Pronto para começar?</h2>
          <p className="mx-auto mt-4 max-w-2xl">
            Cadastre-se agora e tenha acesso a espaços preparados para sua prática profissional.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-8 bg-white text-roomly-600 hover:bg-gray-100"
            onClick={() => navigate("/register")}
          >
            Criar uma conta
          </Button>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
