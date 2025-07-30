import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, FileText, CreditCard, Zap, Clock, Shield, Banknote } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PaymentMethodCardsProps {
  selectedMethod: string;
  onMethodChange: (method: string) => void;
}

const PaymentMethodCards = ({ selectedMethod, onMethodChange }: PaymentMethodCardsProps) => {
  const { user } = useAuth();
  
  // Check if user is admin
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
  
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  
  const paymentMethods = [
    {
      id: 'pix',
      title: 'PIX',
      description: 'Pagamento instantâneo',
      icon: QrCode,
      badge: 'Instantâneo',
      badgeVariant: 'default' as const,
      benefits: ['Aprovação imediata', 'Sem taxas', 'Disponível 24h']
    },
    {
      id: 'boleto',
      title: 'Boleto Bancário',
      description: 'Pagamento em até 3 dias úteis',
      icon: FileText,
      badge: '3 dias úteis',
      badgeVariant: 'secondary' as const,
      benefits: ['Sem cartão necessário', 'Fácil pagamento', 'Todas as instituições']
    },
    {
      id: 'cartao',
      title: 'Cartão de Crédito',
      description: 'Parcelamento em até 12x',
      icon: CreditCard,
      badge: 'Parcelamento',
      badgeVariant: 'outline' as const,
      benefits: ['Até 12x sem juros', 'Proteção antifraude', 'Aprovação rápida']
    }
  ];

  // Add cash payment option for admins
  if (isAdmin) {
    paymentMethods.push({
      id: 'dinheiro',
      title: 'Pagamento em Dinheiro',
      description: 'Apenas para administradores',
      icon: Banknote,
      badge: 'Admin',
      badgeVariant: 'default' as const,
      benefits: ['Confirmação imediata', 'Sem taxas', 'Controle manual']
    });
  }

  return (
    <RadioGroup value={selectedMethod} onValueChange={onMethodChange} className="space-y-3 sm:space-y-4">
      {paymentMethods.map((method) => {
        const Icon = method.icon;
        const isSelected = selectedMethod === method.id;
        
        return (
          <div key={method.id} className="relative">
            <RadioGroupItem 
              value={method.id} 
              id={method.id} 
              className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10"
            />
            <Label htmlFor={method.id} className="cursor-pointer">
              <Card className={`transition-all duration-200 hover:shadow-md rounded-xl md:rounded-2xl ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary bg-primary/5' 
                  : 'hover:border-primary/50'
              }`}>
                <CardContent className="p-3 sm:p-4 pl-8 sm:pl-12">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className={`p-1.5 sm:p-2 rounded-lg ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h3 className="font-semibold text-sm sm:text-base">{method.title}</h3>
                          <Badge variant={method.badgeVariant} className="text-xs">
                            {method.badge}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">{method.description}</p>
                        <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                          {method.benefits.map((benefit, index) => (
                            <div key={index} className="flex items-center space-x-1 text-xs text-muted-foreground">
                              {index === 0 && <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-600" />}
                              {index === 1 && <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600" />}
                              {index === 2 && <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-600" />}
                              <span className="text-xs">{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
};

export default PaymentMethodCards;