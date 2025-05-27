
import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, FileText, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layout/MainLayout";

/**
 * PÁGINA DE INSTRUÇÕES DE PAGAMENTO
 * 
 * Esta página exibe instruções específicas para pagamentos PIX e Boleto
 * que requerem ação do usuário para completar a transação.
 * 
 * Funcionalidades por método:
 * 
 * PIX:
 * - Exibir QR Code para escaneamento
 * - Mostrar código "copia e cola" 
 * - Botão para copiar código para área de transferência
 * - Instrução sobre confirmação automática
 * 
 * BOLETO:
 * - Exibir linha digitável para pagamento
 * - Botão para copiar linha digitável
 * - Link para download do PDF do boleto
 * - Mostrar data de vencimento
 * - Instruções sobre onde pagar
 * 
 * Os dados de pagamento são recebidos via navigation state do checkout
 */
const PaymentInstructions: React.FC = () => {
  // Hook para acessar dados passados via navigation state
  const location = useLocation();
  const { toast } = useToast();
  
  // Estado para controlar feedback visual do botão copiar
  const [copied, setCopied] = useState(false);
  
  // Extrair dados passados da página de checkout
  // paymentMethod: "pix" ou "boleto" 
  // paymentData: dados retornados pelo Click2Pay (QR code, linha digitável, etc.)
  // orderId: ID do pedido para exibir ao usuário
  const { paymentMethod, paymentData, orderId } = location.state || {};

  /**
   * FUNÇÃO PARA COPIAR TEXTO PARA ÁREA DE TRANSFERÊNCIA
   * 
   * Copia códigos PIX ou linha digitável de boleto
   * Fornece feedback visual e toast de confirmação
   * 
   * @param text - Texto a ser copiado (código PIX ou linha digitável)
   */
  const copyToClipboard = (text: string) => {
    // Usar API moderna de clipboard do navegador
    navigator.clipboard.writeText(text);
    
    // Ativar estado visual de "copiado"
    setCopied(true);
    
    // Mostrar toast de confirmação
    toast({
      title: "Copiado!",
      description: "Código copiado para a área de transferência.",
    });
    
    // Resetar estado visual após 2 segundos
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * VALIDAÇÃO DE DADOS
   * 
   * Se não há dados de pagamento, significa que usuário acessou
   * a página diretamente sem passar pelo checkout
   */
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
          
          {/* 
            INSTRUÇÕES PARA PAGAMENTO PIX
            Exibe QR Code e código "copia e cola" para pagamento instantâneo
          */}
          {paymentMethod === "pix" && (
            <Card>
              <CardHeader className="text-center">
                {/* Ícone e título para PIX */}
                <QrCode className="mx-auto h-16 w-16 text-blue-500 mb-4" />
                <CardTitle>Pagamento via Pix</CardTitle>
                <p className="text-muted-foreground">
                  Escaneie o QR Code ou copie o código para pagar
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* 
                  QR CODE EM IMAGEM
                  Click2Pay retorna QR code como imagem base64
                  Exibido para escaneamento com app do banco
                */}
                {paymentData.qrCodeImage && (
                  <div className="flex justify-center">
                    <img 
                      src={`data:image/png;base64,${paymentData.qrCodeImage}`}
                      alt="QR Code Pix"
                      className="max-w-full h-auto border rounded"
                    />
                  </div>
                )}
                
                {/* 
                  CÓDIGO COPIA E COLA
                  String longa que pode ser colada no app do banco
                  Inclui botão para copiar automaticamente
                */}
                {paymentData.pixCode && (
                  <div>
                    <p className="text-sm font-medium mb-2">Código Pix (Copia e Cola):</p>
                    <div className="flex gap-2">
                      {/* Campo readonly com o código PIX */}
                      <input
                        type="text"
                        value={paymentData.pixCode}
                        readOnly
                        className="flex-1 p-2 text-xs border rounded bg-muted"
                      />
                      
                      {/* Botão para copiar código */}
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

                {/* Informações adicionais sobre PIX */}
                <div className="text-center text-sm text-muted-foreground">
                  <p>O pagamento será confirmado automaticamente após a transferência.</p>
                  <p className="mt-2">Pedido: {orderId}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 
            INSTRUÇÕES PARA BOLETO BANCÁRIO
            Exibe linha digitável, link para PDF e data de vencimento
          */}
          {paymentMethod === "boleto" && (
            <Card>
              <CardHeader className="text-center">
                {/* Ícone e título para Boleto */}
                <FileText className="mx-auto h-16 w-16 text-orange-500 mb-4" />
                <CardTitle>Pagamento via Boleto</CardTitle>
                <p className="text-muted-foreground">
                  Use a linha digitável para pagar o boleto
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* 
                  LINHA DIGITÁVEL
                  Sequência numérica para pagamento em bancos/lotéricas
                  Inclui botão para copiar automaticamente
                */}
                {paymentData.linhaDigitavel && (
                  <div>
                    <p className="text-sm font-medium mb-2">Linha Digitável:</p>
                    <div className="flex gap-2">
                      {/* Campo readonly com linha digitável */}
                      <input
                        type="text"
                        value={paymentData.linhaDigitavel}
                        readOnly
                        className="flex-1 p-2 text-xs border rounded bg-muted"
                      />
                      
                      {/* Botão para copiar linha digitável */}
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

                {/* 
                  DOWNLOAD DO PDF
                  Link direto para baixar boleto em PDF
                  Abre em nova aba para não sair da página
                */}
                {paymentData.urlBoleto && (
                  <Button asChild className="w-full">
                    <a href={paymentData.urlBoleto} target="_blank" rel="noopener noreferrer">
                      Baixar Boleto PDF
                    </a>
                  </Button>
                )}

                {/* 
                  DATA DE VENCIMENTO
                  Informa até quando o boleto pode ser pago
                  Formatado para padrão brasileiro (DD/MM/AAAA)
                */}
                {paymentData.vencimento && (
                  <div className="text-center">
                    <p className="text-sm">
                      <strong>Vencimento:</strong> {new Date(paymentData.vencimento).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}

                {/* Informações adicionais sobre boleto */}
                <div className="text-center text-sm text-muted-foreground">
                  <p>Pague o boleto em qualquer banco, lotérica ou internet banking.</p>
                  <p className="mt-2">Pedido: {orderId}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 
            BOTÕES DE NAVEGAÇÃO
            Permitem ao usuário ir para outras páginas enquanto aguarda o pagamento
          */}
          <div className="mt-6 flex flex-col space-y-3">
            {/* Botão para ver pedidos/histórico */}
            <Button asChild variant="outline">
              <Link to="/my-bookings">Ver meus pedidos</Link>
            </Button>
            
            {/* Botão para voltar à página inicial */}
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
