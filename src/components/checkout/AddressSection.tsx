import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormattedInput } from "@/components/ui/formatted-input";
import { CepLookup } from "@/components/ui/cep-lookup";
import { PaymentData } from "@/types/payment";

interface AddressSectionProps {
  paymentData: PaymentData;
  onPaymentDataChange: (field: keyof PaymentData, value: any) => void;
  onAddressFromCep: (address: any) => void;
}

export const AddressSection = ({ paymentData, onPaymentDataChange, onAddressFromCep }: AddressSectionProps) => {
  return (
    <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-3 text-xl">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
          <span>Endereço de Cobrança</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <FormattedInput
            id="cep"
            label="CEP"
            value={paymentData.cep}
            onChange={(value) => onPaymentDataChange("cep", value)}
            type="cep"
            placeholder="00000-000"
            required
            className="flex-1"
          />
          <div className="flex items-end">
            <CepLookup cep={paymentData.cep} onAddressFound={onAddressFromCep} />
          </div>
        </div>
        
        <FormattedInput
          id="rua"
          label="Rua/Logradouro"
          value={paymentData.rua}
          onChange={(value) => onPaymentDataChange("rua", value)}
          type="text"
          required
        />
        
        <div className="grid md:grid-cols-3 gap-4">
          <FormattedInput
            id="numero"
            label="Número"
            value={paymentData.numero}
            onChange={(value) => onPaymentDataChange("numero", value)}
            type="text"
            required
          />
          <FormattedInput
            id="complemento"
            label="Complemento"
            value={paymentData.complemento}
            onChange={(value) => onPaymentDataChange("complemento", value)}
            type="text"
            placeholder="Opcional"
            className="md:col-span-2"
          />
        </div>
        
        <FormattedInput
          id="bairro"
          label="Bairro"
          value={paymentData.bairro}
          onChange={(value) => onPaymentDataChange("bairro", value)}
          type="text"
          required
        />
        
        <div className="grid md:grid-cols-2 gap-4">
          <FormattedInput
            id="cidade"
            label="Cidade"
            value={paymentData.cidade}
            onChange={(value) => onPaymentDataChange("cidade", value)}
            type="text"
            required
          />
          <FormattedInput
            id="estado"
            label="Estado"
            value={paymentData.estado}
            onChange={(value) => onPaymentDataChange("estado", value)}
            type="text"
            placeholder="SP"
            required
          />
        </div>
      </CardContent>
    </Card>
  );
};