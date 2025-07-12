import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CepLookupProps {
  cep: string;
  onAddressFound: (address: {
    rua: string;
    bairro: string;
    cidade: string;
    estado: string;
  }) => void;
}

const CepLookup = ({ cep, onAddressFound }: CepLookupProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const lookupCep = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      toast({
        variant: "destructive",
        title: "CEP inválido",
        description: "Digite um CEP válido com 8 dígitos",
      });
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        throw new Error('CEP não encontrado');
      }
      
      onAddressFound({
        rua: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
      });
      
      toast({
        title: "Endereço encontrado!",
        description: "Os campos foram preenchidos automaticamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao buscar CEP",
        description: "Não foi possível encontrar o endereço. Verifique o CEP digitado.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={lookupCep}
      disabled={loading || cep.replace(/\D/g, '').length !== 8}
      className="mt-1"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Search className="w-4 h-4" />
      )}
      Buscar CEP
    </Button>
  );
};

export default CepLookup;