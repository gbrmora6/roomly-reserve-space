import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface UseCityValidationProps {
  selectedCity: string;
  pageName: string;
}

export const useCityValidation = ({ selectedCity, pageName }: UseCityValidationProps) => {
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const [isCityRequired, setIsCityRequired] = useState(true);

  // Removido o toast automático - mantendo apenas o alerta visual na página

  useEffect(() => {
    // Atualizar o estado de cidade obrigatória
    setIsCityRequired(selectedCity === 'all' || !selectedCity);
  }, [selectedCity]);

  const validateCitySelection = (): boolean => {
    if (selectedCity === 'all' || !selectedCity) {
      toast({
        title: "Cidade não selecionada",
        description: `Por favor, selecione uma cidade antes de continuar com ${pageName.toLowerCase()}.`,
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  return {
    isCityRequired,
    validateCitySelection,
    hasShownWarning
  };
};