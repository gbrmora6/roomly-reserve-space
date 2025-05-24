
import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, FileText, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layout/MainLayout";

const PaymentInstructions: React.FC = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const { paymentMethod, paymentData, orderId } = location.state || {};

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copiado!",
      description: "Código copiado para a área de transferência.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!paymentMethod || !paymentData) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Dados de pagamento não encontrados</h1>
            <Button asChild>
              <Link to="/cart">Voltar ao carrinho</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {paymentMethod === "pix" && (
            <Card>
              <CardHeader className="text-center">
                <QrCode className="mx-auto h-16 w-16 text-blue-500 mb-4" />
                <CardTitle>Pagamento via Pix</CardTitle>
                <p className="text-muted-foreground">
                  Escaneie o QR Code ou copie o código para pagar
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentData.qrCodeImage && (
                  <div className="flex justify-center">
                    <img 
                      src={`data:image/png;base64,${paymentData.qrCodeImage}`}
                      alt="QR Code Pix"
                      className="max-w-full h-auto border rounded"
                    />
                  </div>
                )}
                
                {paymentData.pixCode && (
                  <div>
                    <p className="text-sm font-medium mb-2">Código Pix (Copia e Cola):</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paymentData.pixCode}
                        readOnly
                        className="flex-1 p-2 text-xs border rounded bg-muted"
                      />
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(paymentData.pixCode)}
                        disabled={copied}
                      >
                        {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="text-center text-sm text-muted-foreground">
                  <p>O pagamento será confirmado automaticamente após a transferência.</p>
                  <p className="mt-2">Pedido: {orderId}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {paymentMethod === "boleto" && (
            <Card>
              <CardHeader className="text-center">
                <FileText className="mx-auto h-16 w-16 text-orange-500 mb-4" />
                <CardTitle>Pagamento via Boleto</CardTitle>
                <p className="text-muted-foreground">
                  Use a linha digitável para pagar o boleto
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentData.linhaDigitavel && (
                  <div>
                    <p className="text-sm font-medium mb-2">Linha Digitável:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paymentData.linhaDigitavel}
                        readOnly
                        className="flex-1 p-2 text-xs border rounded bg-muted"
                      />
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(paymentData.linhaDigitavel)}
                        disabled={copied}
                      >
                        {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {paymentData.urlBoleto && (
                  <Button asChild className="w-full">
                    <a href={paymentData.urlBoleto} target="_blank" rel="noopener noreferrer">
                      Baixar Boleto PDF
                    </a>
                  </Button>
                )}

                {paymentData.vencimento && (
                  <div className="text-center">
                    <p className="text-sm">
                      <strong>Vencimento:</strong> {new Date(paymentData.vencimento).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}

                <div className="text-center text-sm text-muted-foreground">
                  <p>Pague o boleto em qualquer banco, lotérica ou internet banking.</p>
                  <p className="mt-2">Pedido: {orderId}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 flex flex-col space-y-3">
            <Button asChild variant="outline">
              <Link to="/my-bookings">Ver meus pedidos</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Voltar para a página inicial</Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PaymentInstructions;
