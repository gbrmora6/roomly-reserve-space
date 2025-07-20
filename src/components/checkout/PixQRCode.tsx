import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Copy, CheckCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PixQRCodeProps {
  qrCodeImage?: string;
  pixCode?: string;
  reference?: string;
  orderId?: string;
}

const PixQRCode: React.FC<PixQRCodeProps> = ({ 
  qrCodeImage, 
  pixCode, 
  reference, 
  orderId 
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copiado!",
      description: "Código PIX copiado para a área de transferência.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQRCode = () => {
    if (!qrCodeImage) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${qrCodeImage}`;
    link.download = `qr-code-pix-${orderId || 'pagamento'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "QR Code baixado!",
      description: "O QR Code foi salvo em seus downloads.",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <QrCode className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle className="text-xl font-bold text-gray-900">
          Pagamento via PIX
        </CardTitle>
        <p className="text-sm text-gray-600">
          Escaneie o QR Code ou copie o código para pagar
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* QR Code Image */}
        {qrCodeImage && (
          <div className="flex flex-col items-center space-y-3">
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
              <img 
                src={`data:image/png;base64,${qrCodeImage}`}
                alt="QR Code PIX"
                className="w-48 h-48 object-contain"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQRCode}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Baixar QR Code</span>
            </Button>
          </div>
        )}
        
        {/* PIX Code */}
        {pixCode && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Código PIX (Copia e Cola):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pixCode}
                readOnly
                className="flex-1 p-3 text-xs border border-gray-300 rounded-md bg-gray-50 font-mono"
              />
              <Button
                size="sm"
                onClick={() => copyToClipboard(pixCode)}
                disabled={copied}
                className="px-3"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}
        
        {/* Payment Info */}
        <div className="bg-blue-50 p-4 rounded-lg space-y-2">
          <div className="flex items-center justify-center space-x-2 text-blue-800">
            <QrCode className="w-5 h-5" />
            <span className="font-medium">Pagamento Instantâneo</span>
          </div>
          <p className="text-sm text-blue-700 text-center">
            O pagamento será confirmado automaticamente após a transferência.
          </p>
          {reference && (
            <p className="text-xs text-blue-600 text-center">
              Referência: {reference}
            </p>
          )}
          {orderId && (
            <p className="text-xs text-blue-600 text-center">
              Pedido: {orderId}
            </p>
          )}
        </div>
        
        {/* Instructions */}
        <div className="text-center space-y-2">
          <h4 className="font-medium text-gray-900">Como pagar:</h4>
          <ol className="text-sm text-gray-600 space-y-1 text-left">
            <li>1. Abra o app do seu banco</li>
            <li>2. Escaneie o QR Code ou cole o código PIX</li>
            <li>3. Confirme o pagamento</li>
            <li>4. Pronto! Você receberá a confirmação</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default PixQRCode;