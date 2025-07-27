import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CreditCard, QrCode, FileText } from "lucide-react";

interface PaymentMethodErrorHandlerProps {
  paymentMethod: string;
  error?: string | null;
}

const getMethodIcon = (method: string) => {
  switch (method) {
    case 'cartao':
      return <CreditCard className="h-4 w-4" />;
    case 'pix':
      return <QrCode className="h-4 w-4" />;
    case 'boleto':
      return <FileText className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

const getMethodName = (method: string) => {
  switch (method) {
    case 'cartao':
      return 'Cartão de Crédito';
    case 'pix':
      return 'PIX';
    case 'boleto':
      return 'Boleto';
    default:
      return 'Pagamento';
  }
};

const getMethodTips = (method: string) => {
  switch (method) {
    case 'cartao':
      return [
        "Verifique se o número do cartão está correto",
        "Confirme se o CVV está correto (3 dígitos no verso)",
        "Certifique-se de que o cartão não está vencido",
        "Verifique se há limite disponível"
      ];
    case 'pix':
      return [
        "Verifique sua conexão com a internet",
        "Certifique-se de que seu banco suporta PIX",
        "O PIX estará disponível por 30 minutos",
        "Use o app do seu banco para escanear o QR Code"
      ];
    case 'boleto':
      return [
        "Valor mínimo para boleto: R$ 30,00",
        "Vencimento em 3 dias úteis",
        "Pode ser pago em qualquer banco ou lotérica",
        "Confirmação em até 2 dias úteis após pagamento"
      ];
    default:
      return [];
  }
};

export const PaymentMethodErrorHandler: React.FC<PaymentMethodErrorHandlerProps> = ({
  paymentMethod,
  error
}) => {
  const tips = getMethodTips(paymentMethod);

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {tips.length > 0 && (
        <Alert>
          <div className="flex items-center gap-2 mb-2">
            {getMethodIcon(paymentMethod)}
            <span className="font-medium">
              Dicas para {getMethodName(paymentMethod)}:
            </span>
          </div>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};