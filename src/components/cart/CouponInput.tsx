import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Trash2, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CouponInputProps {
  cartTotal: number;
  cartItemCount: number;
  onCouponApplied: (couponData: {
    couponId: string;
    discountAmount: number;
    couponCode: string;
  }) => void;
  onCouponRemoved: () => void;
  appliedCoupon?: {
    couponId: string;
    discountAmount: number;
    couponCode: string;
  } | null;
}

interface CouponResult {
  is_valid: boolean;
  coupon_id?: string;
  discount_amount?: number;
  error_message?: string;
}

const CouponInput: React.FC<CouponInputProps> = ({
  cartTotal,
  cartItemCount,
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon
}) => {
  const [couponCode, setCouponCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: "Erro",
        description: "Digite um código de cupom",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);

    try {
      // Buscar cupom
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode)
        .eq('is_active', true)
        .single();

      if (couponError || !coupon) {
        throw new Error('Cupom não encontrado ou inativo');
      }

      // Validações básicas
      if (new Date(coupon.valid_until) < new Date()) {
        throw new Error('Cupom expirado');
      }

      if (cartTotal < coupon.minimum_amount) {
        throw new Error(`Valor mínimo não atingido: R$ ${coupon.minimum_amount}`);
      }

      if (cartItemCount < coupon.minimum_items) {
        throw new Error(`Quantidade mínima de itens não atingida: ${coupon.minimum_items}`);
      }

      // Calcular desconto
      let discountAmount = 0;
      if (coupon.discount_type === 'fixed') {
        discountAmount = Math.min(coupon.discount_value, cartTotal);
      } else {
        discountAmount = (cartTotal * coupon.discount_value) / 100;
      }

      const result: CouponResult = {
        is_valid: true,
        coupon_id: coupon.id,
        discount_amount: discountAmount
      };

      if (result.is_valid && result.coupon_id && result.discount_amount) {
        onCouponApplied({
          couponId: result.coupon_id,
          discountAmount: result.discount_amount,
          couponCode: couponCode
        });

        toast({
          title: "Cupom aplicado!",
          description: `Desconto de R$ ${result.discount_amount.toFixed(2)} aplicado`,
        });

        setCouponCode("");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao validar cupom",
        description: error.message || "Cupom inválido",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const removeCoupon = () => {
    onCouponRemoved();
    toast({
      title: "Cupom removido",
      description: "O desconto foi removido do pedido",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Cupom de Desconto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {appliedCoupon ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {appliedCoupon.couponCode}
                </Badge>
                <span className="text-sm text-green-700 dark:text-green-300">
                  Desconto: R$ {appliedCoupon.discountAmount.toFixed(2)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeCoupon}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Digite o código do cupom"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    validateCoupon();
                  }
                }}
              />
              <Button
                onClick={validateCoupon}
                disabled={isValidating || !couponCode.trim()}
                className="whitespace-nowrap"
              >
                {isValidating ? "Validando..." : "Aplicar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Digite um código válido para aplicar desconto
            </p>
          </div>
        )}
        
        <Separator />
        
        <div className="text-sm text-muted-foreground">
          <p>💡 <strong>Dica:</strong> Alguns cupons podem ter restrições de uso, valores mínimos ou serem válidos apenas para determinados produtos.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export { CouponInput };