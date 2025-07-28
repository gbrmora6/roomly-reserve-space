import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Copy, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedOrder } from '@/hooks/useUnifiedOrders';

interface PIXPaymentSectionProps {
  order: UnifiedOrder;
  onOrderCancelled?: () => void;
}

interface PaymentDetails {
  pix_code?: string;
  pix_qr_code?: string;
  pix_expiration?: string;
}

const PIXPaymentSection: React.FC<PIXPaymentSectionProps> = ({ order, onOrderCancelled }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Extract PIX data from order's click2pay_response
  const pixData = order.click2pay_response?.pix;
  const pixCode = pixData?.qr_code;
  const pixQRCode = pixData?.qr_code_image?.value;

  // Function to cancel expired PIX order
  const cancelExpiredOrder = async () => {
    if (isCancelling) return;
    
    setIsCancelling(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-expired-pix-order', {
        body: { orderId: order.id }
      });

      if (error) {
        console.error('Erro ao cancelar pedido PIX:', error);
        toast({
          title: "Erro",
          description: "Erro ao cancelar pedido expirado",
          variant: "destructive"
        });
      } else {
        toast({
          title: "PIX Expirado",
          description: "Pedido cancelado automaticamente por expiração",
          variant: "default"
        });
        onOrderCancelled?.();
      }
    } catch (error) {
      console.error('Erro na requisição de cancelamento:', error);
    } finally {
      setIsCancelling(false);
    }
  };

  // Calculate time left and update timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const createTime = new Date(order.created_at).getTime();
      const expirationTime = createTime + (20 * 60 * 1000); // 20 minutes
      const now = new Date().getTime();
      const remaining = Math.max(0, expirationTime - now);
      
      setTimeLeft(remaining);
      const expired = remaining === 0;
      setIsExpired(expired);
      
      // Cancel order when timer reaches 0
      if (expired && !isCancelling && order.status !== 'cancelled') {
        cancelExpiredOrder();
      }
      
      return remaining;
    };

    // Initial calculation
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(() => {
      calculateTimeLeft();
    }, 1000);

    return () => clearInterval(timer);
  }, [order.created_at, order.status, isCancelling]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copiado!",
      description: "Código PIX copiado para a área de transferência."
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getImageSrc = (imageData: string) => {
    if (!imageData) return '';
    if (imageData.startsWith('data:image/')) {
      return imageData;
    }
    return `data:image/png;base64,${imageData}`;
  };

  // Don't render if expired or no PIX data
  if (isExpired || !pixData || !pixCode) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50 backdrop-blur-sm mt-4">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Timer */}
          <div className="flex items-center justify-center gap-2 text-blue-800">
            <Clock className="h-5 w-5" />
            <span className="font-semibold">Tempo restante: {formatTime(timeLeft)}</span>
          </div>

          {/* QR Code */}
          {pixQRCode && (
            <div className="flex justify-center">
              <div className="p-2 bg-white rounded-lg border border-blue-200">
                <img 
                  src={getImageSrc(pixQRCode)} 
                  alt="QR Code PIX" 
                  className="w-32 h-32 object-contain"
                />
              </div>
            </div>
          )}

          {/* PIX Code */}
          {pixCode && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-800">
                Código PIX (Copia e Cola):
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={pixCode} 
                  readOnly 
                  className="flex-1 p-2 text-xs border border-blue-300 rounded-md bg-white font-mono"
                />
                <Button 
                  size="sm" 
                  onClick={() => copyToClipboard(pixCode)} 
                  disabled={copied}
                  className="px-3 bg-blue-600 hover:bg-blue-700"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-100/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <QrCode className="w-4 h-4" />
              <span className="font-medium text-sm">Como pagar via PIX:</span>
            </div>
            <ol className="text-xs text-blue-700 space-y-1">
              <li>1. Abra o app do seu banco</li>
              <li>2. Escaneie o QR Code ou cole o código PIX</li>
              <li>3. Confirme o pagamento</li>
              <li>4. Aguarde a confirmação automática</li>
            </ol>
          </div>

          {/* Low time warning */}
          {timeLeft < 5 * 60 * 1000 && ( // Less than 5 minutes
            <div className="bg-amber-100 border border-amber-300 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium text-sm">Atenção: Pouco tempo restante!</span>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Complete o pagamento antes que o PIX expire.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PIXPaymentSection;