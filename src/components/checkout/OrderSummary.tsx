import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Lock, Truck, Clock } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

interface CartItem {
  id: string;
  price: number;
  quantity: number;
  metadata?: any;
}

interface OrderSummaryProps {
  cartItems: CartItem[];
  cartTotal: number;
}

const OrderSummary = ({ cartItems, cartTotal }: OrderSummaryProps) => {
  return (
    <div className="space-y-4">
      <Card className="sticky top-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center justify-between">
            Resumo do Pedido
            <Badge variant="secondary" className="text-xs">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {cartItems.map((item, index) => (
              <div key={item.id || index} className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {item.metadata?.name || 'Produto'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Qtd: {item.quantity}
                  </div>
                </div>
                <div className="text-sm font-medium">
                  {formatCurrency(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Frete</span>
              <span>Grátis</span>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center text-base font-bold">
            <span>Total</span>
            <span className="text-lg">{formatCurrency(cartTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Elementos de confiança */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-muted-foreground">Pagamento 100% seguro</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Lock className="w-4 h-4 text-green-600" />
              <span className="text-muted-foreground">Dados protegidos SSL</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Truck className="w-4 h-4 text-blue-600" />
              <span className="text-muted-foreground">Frete grátis</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-muted-foreground">Processamento rápido</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderSummary;