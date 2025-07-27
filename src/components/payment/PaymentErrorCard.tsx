import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, QrCode, FileText, RefreshCw, ArrowLeft } from "lucide-react";

export interface PaymentError {
  type: 'card' | 'pix' | 'boleto' | 'general';
  code?: string;
  message: string;
  title: string;
  suggestion?: string;
  canRetry?: boolean;
  showChangeMethod?: boolean;
}

interface PaymentErrorCardProps {
  error: PaymentError;
  onRetry?: () => void;
  onChangeMethod?: () => void;
  onGoBack?: () => void;
}

const getErrorIcon = (type: PaymentError['type']) => {
  switch (type) {
    case 'card':
      return <CreditCard className="h-8 w-8 text-destructive" />;
    case 'pix':
      return <QrCode className="h-8 w-8 text-destructive" />;
    case 'boleto':
      return <FileText className="h-8 w-8 text-destructive" />;
    default:
      return <AlertTriangle className="h-8 w-8 text-destructive" />;
  }
};

const getErrorColor = (type: PaymentError['type']) => {
  switch (type) {
    case 'card':
      return 'border-l-blue-500';
    case 'pix':
      return 'border-l-green-500';
    case 'boleto':
      return 'border-l-orange-500';
    default:
      return 'border-l-destructive';
  }
};

export const PaymentErrorCard: React.FC<PaymentErrorCardProps> = ({
  error,
  onRetry,
  onChangeMethod,
  onGoBack
}) => {
  return (
    <Card className={`border-l-4 ${getErrorColor(error.type)} shadow-lg`}>
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          {getErrorIcon(error.type)}
        </div>
        <CardTitle className="text-xl text-destructive mb-2">
          {error.title}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          {error.message}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error.suggestion && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium text-foreground mb-2">
              💡 Sugestão:
            </p>
            <p className="text-sm text-muted-foreground">
              {error.suggestion}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {error.canRetry && onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
          
          {error.showChangeMethod && onChangeMethod && (
            <Button 
              onClick={onChangeMethod} 
              variant="outline" 
              className="w-full"
            >
              Escolher Outro Método
            </Button>
          )}
          
          {onGoBack && (
            <Button 
              onClick={onGoBack} 
              variant="ghost" 
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Carrinho
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};