
import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, FileText, Copy, CheckCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layout/MainLayout";
import PixQRCode from "@/components/checkout/PixQRCode";

const PaymentInstructions: React.FC = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const { paymentMethod, paymentData, orderId, tid } = location.state || {};

  console.log("PaymentInstructions - dados recebidos:", {
    paymentMethod,
    paymentData,
    orderId,
    tid
  });

  const copyToClipboard = (text: string) => {
    if (!text) {
      toast({
        title: "Erro",
        description: "Não há texto para copiar.",
        variant: "destructive"
      });
      return;
    }
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copiado!",
      description: "Código copiado para a área de transferência.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Função para gerar QR Code localmente se não tiver imagem (problema 2)
  const generateLocalQRCode = (pixCode: string) => {
    // Implementação simples de QR Code usando biblioteca externa ou API
    // Por enquanto, retornar placeholder
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`;
  };

  if (!paymentMethod || !paymentData) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Dados de pagamento não encontrados</h1>
            <p className="text-muted-foreground mb-4">
              Os dados da transação não foram encontrados. Isso pode acontecer se:
            </p>
            <ul className="text-sm text-muted-foreground mb-6 text-left max-w-md">
              <li>• A sessão expirou</li>
              <li>• A página foi recarregada</li>
              <li>• Houve um erro na criação da transação</li>
            </ul>
            <div className="space-x-4">
              <Button asChild>
                <Link to="/cart">Voltar ao carrinho</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/my-bookings">Ver meus pedidos</Link>
              </Button>
            </div>
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
                <CardTitle>Pagamento via PIX</CardTitle>
                <p className="text-muted-foreground">
                  Escaneie o QR Code ou copie o código para pagar
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* QR Code - usar dados corretos da Click2Pay */}
                {(paymentData.qr_code_image || paymentData.qrCodeImage) && (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
                      <img 
                        src={paymentData.qr_code_image ? 
                          `data:image/png;base64,${paymentData.qr_code_image}` : 
                          paymentData.qrCodeImage
                        }
                        alt="QR Code PIX"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Se não tiver imagem, gerar QR Code local (problema 2) */}
                {!paymentData.qr_code_image && !paymentData.qrCodeImage && paymentData.qr_code && (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
                      <img 
                        src={generateLocalQRCode(paymentData.qr_code)}
                        alt="QR Code PIX (gerado localmente)"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">QR Code gerado localmente</p>
                  </div>
                )}
                
                {/* Código PIX para copiar */}
                {(paymentData.qr_code || paymentData.pixCode) && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                      Código PIX (Copia e Cola):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paymentData.qr_code || paymentData.pixCode}
                        readOnly
                        className="flex-1 p-3 text-xs border border-gray-300 rounded-md bg-gray-50 font-mono"
                      />
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(paymentData.qr_code || paymentData.pixCode)}
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
                
                {/* Informações do pagamento */}
                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-center space-x-2 text-blue-800">
                    <QrCode className="w-5 h-5" />
                    <span className="font-medium">Pagamento Instantâneo</span>
                  </div>
                  <p className="text-sm text-blue-700 text-center">
                    O pagamento será confirmado automaticamente após a transferência.
                  </p>
                  {paymentData.expires_at && (
                    <p className="text-xs text-blue-600 text-center">
                      Expira em: {new Date(paymentData.expires_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                  {(orderId || tid) && (
                    <p className="text-xs text-blue-600 text-center">
                      Pedido: {orderId || tid}
                    </p>
                  )}
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
                  Use os dados abaixo para pagar o boleto
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* URL do Boleto (problema 2) */}
                {(paymentData.url || paymentData.boleto_url || paymentData.urlBoleto) && (
                  <Button asChild className="w-full" size="lg">
                    <a 
                      href={paymentData.url || paymentData.boleto_url || paymentData.urlBoleto} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2"
                    >
                      <Download className="w-5 h-5" />
                      <span>Baixar Boleto PDF</span>
                    </a>
                  </Button>
                )}

                {/* Código de Barras (problema 2) */}
                {(paymentData.barcode || paymentData.boleto_barcode) && (
                  <div>
                    <p className="text-sm font-medium mb-2">Código de Barras:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paymentData.barcode || paymentData.boleto_barcode}
                        readOnly
                        className="flex-1 p-2 text-xs border rounded bg-muted font-mono"
                      />
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(paymentData.barcode || paymentData.boleto_barcode)}
                        disabled={copied}
                      >
                        {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Linha Digitável (se disponível) */}
                {paymentData.linhaDigitavel && (
                  <div>
                    <p className="text-sm font-medium mb-2">Linha Digitável:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paymentData.linhaDigitavel}
                        readOnly
                        className="flex-1 p-2 text-xs border rounded bg-muted font-mono"
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

                {/* Data de Vencimento */}
                {(paymentData.vencimento || paymentData.due_date || paymentData.boleto_due_date) && (
                  <div className="text-center">
                    <p className="text-sm">
                      <strong>Vencimento:</strong> {
                        new Date(
                          paymentData.vencimento || 
                          paymentData.due_date || 
                          paymentData.boleto_due_date
                        ).toLocaleDateString('pt-BR')
                      }
                    </p>
                  </div>
                )}

                <div className="text-center text-sm text-muted-foreground">
                  <p>Pague o boleto em qualquer banco, lotérica ou internet banking.</p>
                  {(orderId || tid) && (
                    <p className="mt-2">Pedido: {orderId || tid}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {paymentMethod === "cartao" && (
            <Card>
              <CardHeader className="text-center">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                <CardTitle>Pagamento Processado</CardTitle>
                <p className="text-muted-foreground">
                  Seu pagamento com cartão foi processado
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentData.authorization_code && (
                  <div className="text-center">
                    <p className="text-sm">
                      <strong>Código de Autorização:</strong> {paymentData.authorization_code}
                    </p>
                  </div>
                )}
                
                <div className="text-center text-sm text-muted-foreground">
                  <p>Você receberá um email de confirmação em breve.</p>
                  {(orderId || tid) && (
                    <p className="mt-2">Pedido: {orderId || tid}</p>
                  )}
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
