import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormattedInput } from "@/components/ui/formatted-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentMethodCards } from "@/components/ui/payment-method-cards";
import { CreditCardPreview } from "@/components/ui/credit-card-preview";
import { PaymentMethodErrorHandler } from "./PaymentMethodErrorHandler";
import { PaymentData } from "@/types/payment";
import { formatCurrency } from "@/utils/formatCurrency";
import { useEffect } from "react";

interface PaymentMethodSectionProps {
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  paymentData: PaymentData;
  onPaymentDataChange: (field: keyof PaymentData, value: any) => void;
  finalTotal: number;
  error?: string | null;
}

export const PaymentMethodSection = ({ 
  paymentMethod, 
  onPaymentMethodChange, 
  paymentData, 
  onPaymentDataChange, 
  finalTotal,
  error 
}: PaymentMethodSectionProps) => {
  
  // Calculate maximum installments based on R$ 200 minimum per installment
  const MIN_INSTALLMENT_VALUE = 200;
  const maxInstallments = Math.min(12, Math.max(1, Math.floor(finalTotal / MIN_INSTALLMENT_VALUE)));
  const installmentOptions = Array.from({ length: maxInstallments }, (_, i) => i + 1);
  
  // Auto-adjust installments if current selection exceeds maximum
  useEffect(() => {
    if (paymentData.parcelas > maxInstallments) {
      onPaymentDataChange("parcelas", maxInstallments);
    }
  }, [maxInstallments, paymentData.parcelas, onPaymentDataChange]);
  return (
    <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-3 text-xl">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
          <span>Método de Pagamento</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PaymentMethodCards 
          selectedMethod={paymentMethod} 
          onMethodChange={onPaymentMethodChange} 
        />

        <PaymentMethodErrorHandler 
          paymentMethod={paymentMethod}
          error={error}
        />

        {/* Campos específicos para cartão */}
        {paymentMethod === "cartao" && (
          <div className="mt-6 space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormattedInput
                  id="numeroCartao"
                  label="Número do Cartão"
                  value={paymentData.numeroCartao}
                  onChange={(value) => onPaymentDataChange("numeroCartao", value)}
                  type="card"
                  placeholder="1234 5678 9012 3456"
                  required
                />
                <FormattedInput
                  id="nomeNoCartao"
                  label="Nome no Cartão"
                  value={paymentData.nomeNoCartao}
                  onChange={(value) => onPaymentDataChange("nomeNoCartao", value)}
                  type="text"
                  placeholder="Como está impresso no cartão"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormattedInput
                    id="validadeCartao"
                    label="Validade"
                    value={paymentData.validadeCartao}
                    onChange={(value) => onPaymentDataChange("validadeCartao", value)}
                    type="expiry"
                    placeholder="MM/AAAA"
                    required
                  />
                  <FormattedInput
                    id="cvv"
                    label="CVV"
                    value={paymentData.cvv}
                    onChange={(value) => onPaymentDataChange("cvv", value)}
                    type="cvv"
                    placeholder="123"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Parcelas <span className="text-destructive">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Parcela mínima de {formatCurrency(MIN_INSTALLMENT_VALUE)}
                  </p>
                  <Select 
                    value={paymentData.parcelas.toString()} 
                    onValueChange={(value) => onPaymentDataChange("parcelas", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione as parcelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {installmentOptions.map(i => {
                        const installmentValue = finalTotal / i;
                        return (
                          <SelectItem key={i} value={i.toString()}>
                            {i}x de {formatCurrency(installmentValue)}
                            {i === 1 ? " à vista" : " sem juros"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {maxInstallments < 12 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Máximo de {maxInstallments}x para este valor
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-center">
                <CreditCardPreview
                  cardNumber={paymentData.numeroCartao}
                  cardName={paymentData.nomeNoCartao}
                  cardExpiry={paymentData.validadeCartao}
                  cvv={paymentData.cvv}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};