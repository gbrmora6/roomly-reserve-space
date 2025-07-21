
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, QrCode, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PixActionsProps {
  paymentDetails: any;
  isExpired: boolean;
}

export function PixActions({ paymentDetails, isExpired }: PixActionsProps) {
  const { toast } = useToast();
  const [showQrCode, setShowQrCode] = useState(false);

  const copyPixCode = () => {
    if (paymentDetails.pix_code) {
      navigator.clipboard.writeText(paymentDetails.pix_code);
      toast({
        title: "Código PIX copiado",
        description: "Cole no seu app bancário para pagar",
      });
    }
  };

  const openBankApp = () => {
    // Tentar abrir apps bancários populares
    const bankApps = [
      'nubank://',
      'inter://',
      'bradesco://',
      'itau://',
      'santander://',
      'bb://',
      'caixa://'
    ];

    // Tenta abrir o primeiro app disponível
    bankApps.forEach((app, index) => {
      setTimeout(() => {
        window.location.href = app;
      }, index * 100);
    });

    toast({
      title: "Abrindo app bancário",
      description: "Se nenhum app abrir, copie o código PIX manualmente",
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm">Ações do PIX:</h4>
      
      <div className="flex flex-wrap gap-2">
        {paymentDetails.pix_code && (
          <Button
            variant="outline"
            size="sm"
            onClick={copyPixCode}
            className="flex items-center gap-1"
            disabled={isExpired}
          >
            <Copy className="h-4 w-4" />
            Copiar Código PIX
          </Button>
        )}

        {paymentDetails.pix_qr_code && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQrCode(true)}
            className="flex items-center gap-1"
            disabled={isExpired}
          >
            <QrCode className="h-4 w-4" />
            Ver QR Code
          </Button>
        )}

        {!isExpired && (
          <Button
            variant="outline"
            size="sm"
            onClick={openBankApp}
            className="flex items-center gap-1"
          >
            <Smartphone className="h-4 w-4" />
            Abrir App do Banco
          </Button>
        )}
      </div>

      {paymentDetails.pix_code && !isExpired && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Código PIX Copia e Cola:</p>
          <p className="font-mono text-sm break-all">
            {paymentDetails.pix_code}
          </p>
        </div>
      )}

      {isExpired && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            Este PIX expirou. Você pode gerar um novo pagamento.
          </p>
        </div>
      )}

      {/* Modal do QR Code */}
      <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code PIX</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {paymentDetails.pix_qr_code && !isExpired ? (
              <img 
                src={paymentDetails.pix_qr_code} 
                alt="QR Code PIX" 
                className="w-64 h-64 border rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 bg-gray-100 border rounded-lg flex items-center justify-center">
                <p className="text-gray-500">
                  {isExpired ? "QR Code expirado" : "QR Code não disponível"}
                </p>
              </div>
            )}
            <p className="text-sm text-center text-muted-foreground">
              {isExpired ? "Este código PIX expirou" : "Escaneie este QR Code com o app do seu banco ou Pix"}
            </p>
            {!isExpired && paymentDetails.pix_code && (
              <Button
                variant="outline"
                onClick={copyPixCode}
                className="w-full"
              >
                Ou copie o código PIX
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
