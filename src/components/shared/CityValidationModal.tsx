import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MapPin, AlertTriangle } from 'lucide-react';

interface CityValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageName: string;
}

export const CityValidationModal: React.FC<CityValidationModalProps> = ({ 
  isOpen, 
  onClose, 
  pageName 
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md bg-gradient-to-br from-background to-secondary/10 border-primary/20 shadow-3d">
        <AlertDialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full flex items-center justify-center border border-orange-200">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
          <AlertDialogTitle className="text-xl text-primary flex items-center justify-center gap-2">
            <MapPin className="h-5 w-5" />
            Cidade não selecionada
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground mt-3 text-center">
            Para continuar com a reserva de <strong>{pageName}</strong>, você precisa selecionar uma cidade primeiro.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="bg-orange-50/50 border border-orange-200 rounded-lg p-4 my-4">
          <p className="text-sm text-orange-800 text-center">
            <strong>Por que isso é necessário?</strong><br />
            Isso garante que você veja apenas os itens disponíveis na sua região e evita reservas na cidade errada.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Entendi, vou selecionar uma cidade
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};