import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CityRequiredAlertProps {
  pageName: string;
  onDismiss?: () => void;
  showDismissButton?: boolean;
}

export const CityRequiredAlert: React.FC<CityRequiredAlertProps> = ({ 
  pageName, 
  onDismiss,
  showDismissButton = true 
}) => {
  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50 text-orange-800">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Seleção de cidade obrigatória
        </span>
        {showDismissButton && onDismiss && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDismiss}
            className="h-auto p-1 text-orange-600 hover:text-orange-800 hover:bg-orange-100"
          >
            ✕
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2">
        Por favor, <strong>selecione uma cidade</strong> antes de navegar pelos {pageName.toLowerCase()}. 
        Isso garante que você veja apenas os itens disponíveis na sua região e evita reservas ou compras na cidade errada.
      </AlertDescription>
    </Alert>
  );
};

export default CityRequiredAlert;