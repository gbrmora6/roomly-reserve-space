import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BoletoActionsProps {
  paymentDetails: any;
  isExpired: boolean;
}

export function BoletoActions({ paymentDetails, isExpired }: BoletoActionsProps) {
  const { toast } = useToast();

  const copyBarcode = () => {
    if (paymentDetails.boleto_barcode) {
      navigator.clipboard.writeText(paymentDetails.boleto_barcode);
      toast({
        title: "Código copiado",
        description: "Código de barras copiado para a área de transferência",
      });
    }
  };

  const openBoleto = () => {
    if (paymentDetails.boleto_url) {
      window.open(paymentDetails.boleto_url, '_blank');
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm">Ações do Boleto:</h4>
      
      <div className="flex flex-wrap gap-2">
        {paymentDetails.boleto_url && (
          <Button
            variant="outline"
            size="sm"
            onClick={openBoleto}
            className="flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            Ver Boleto
          </Button>
        )}

        {paymentDetails.boleto_barcode && (
          <Button
            variant="outline"
            size="sm"
            onClick={copyBarcode}
            className="flex items-center gap-1"
          >
            <Copy className="h-4 w-4" />
            Copiar Código
          </Button>
        )}

        {paymentDetails.boleto_url && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const link = document.createElement('a');
              link.href = paymentDetails.boleto_url;
              link.download = 'boleto.pdf';
              link.click();
            }}
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
        )}
      </div>

      {paymentDetails.boleto_barcode && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Código de barras:</p>
          <p className="font-mono text-sm break-all">
            {paymentDetails.boleto_barcode}
          </p>
        </div>
      )}

      {isExpired && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            Este boleto expirou. Entre em contato para gerar um novo ou escolha outro método de pagamento.
          </p>
        </div>
      )}
    </div>
  );
}