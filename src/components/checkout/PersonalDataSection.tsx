import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormattedInput } from "@/components/ui/formatted-input";
import { PaymentData } from "@/types/payment";

interface PersonalDataSectionProps {
  paymentData: PaymentData;
  onPaymentDataChange: (field: keyof PaymentData, value: any) => void;
}

export const PersonalDataSection = ({ paymentData, onPaymentDataChange }: PersonalDataSectionProps) => {
  return (
    <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-3 text-xl">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
          <span>Dados Pessoais</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <FormattedInput
            id="nome"
            label="Nome Completo"
            value={paymentData.nome}
            onChange={(value) => onPaymentDataChange("nome", value)}
            type="text"
            required
          />
          <FormattedInput
            id="email"
            label="E-mail"
            value={paymentData.email}
            onChange={(value) => onPaymentDataChange("email", value)}
            type="email"
            required
          />
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <FormattedInput
            id="cpf"
            label="CPF"
            value={paymentData.cpf}
            onChange={(value) => onPaymentDataChange("cpf", value)}
            type="cpf"
            placeholder="000.000.000-00"
            required
          />
          <FormattedInput
            id="telefone"
            label="Telefone"
            value={paymentData.telefone}
            onChange={(value) => onPaymentDataChange("telefone", value)}
            type="phone"
            placeholder="(11) 99999-9999"
            required
          />
        </div>
      </CardContent>
    </Card>
  );
};