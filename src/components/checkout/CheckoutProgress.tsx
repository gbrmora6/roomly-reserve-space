import React from 'react';
import { Check } from 'lucide-react';

interface CheckoutProgressProps {
  currentStep: number;
}

const CheckoutProgress = ({ currentStep }: CheckoutProgressProps) => {
  const steps = [
    { number: 1, title: 'Dados Pessoais', desc: 'Informações básicas' },
    { number: 2, title: 'Endereço', desc: 'Endereço de faturamento' },
    { number: 3, title: 'Pagamento', desc: 'Finalizar pedido' }
  ];

  return (
    <div className="flex items-center justify-between w-full mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="contents">
          <div className="flex flex-col items-center">
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
              ${currentStep > step.number 
                ? 'bg-primary border-primary text-primary-foreground' 
                : currentStep === step.number 
                ? 'border-primary text-primary bg-primary/10' 
                : 'border-muted-foreground/30 text-muted-foreground bg-background'
              }
            `}>
              {currentStep > step.number ? (
                <Check className="w-5 h-5" />
              ) : (
                <span className="font-semibold">{step.number}</span>
              )}
            </div>
            <div className="mt-2 text-center">
              <div className={`text-sm font-medium ${
                currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.title}
              </div>
              <div className="text-xs text-muted-foreground">{step.desc}</div>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${
              currentStep > step.number ? 'bg-primary' : 'bg-muted-foreground/20'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};

export default CheckoutProgress;