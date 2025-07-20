import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  unidade: string;
  bairro: string;
  localidade: string;
  uf: string;
  estado: string;
  regiao: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

export const useViaCep = () => {
  const [isLoading, setIsLoading] = useState(false);

  const searchCep = async (cep: string): Promise<ViaCepResponse | null> => {
    // Remove caracteres não numéricos do CEP
    const cleanCep = cep.replace(/\D/g, '');
    
    // Verifica se o CEP tem 8 dígitos
    if (cleanCep.length !== 8) {
      toast({
        variant: "destructive",
        title: "CEP inválido",
        description: "O CEP deve conter 8 dígitos.",
      });
      return null;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      
      if (!response.ok) {
        throw new Error('Erro na consulta do CEP');
      }
      
      const data: ViaCepResponse = await response.json();
      
      if (data.erro) {
        toast({
          variant: "destructive",
          title: "CEP não encontrado",
          description: "O CEP informado não foi encontrado.",
        });
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar CEP",
        description: "Não foi possível consultar o CEP. Tente novamente.",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    searchCep,
    isLoading
  };
};