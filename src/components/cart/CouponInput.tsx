
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/utils/formatCurrency";

interface CouponResult {
  is_valid: boolean;
  coupon_id: string;
  discount_amount: number;
  error_message?: string;
}

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
        variant: "destructive",
        title: "Erro",
        description: "Digite um código de cupom válido."
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você precisa estar logado para aplicar cupons."
      });
      return;
    }

    setIsValidating(true);

    try {
      // Chamar a função validate_coupon do Supabase
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: couponCode.toUpperCase(),
        p_user_id: user.id,
        p_total_amount: cartTotal,
        p_item_count: cartItemCount,
        p_applicable_type: 'all' // Por enquanto, aceita todos os tipos
      });

      if (error) {
        console.error('Erro ao validar cupom:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro interno ao validar o cupom. Tente novamente."
        });
        return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0] as CouponResult;
        
        if (result.is_valid) {
          // Cupom válido
          onCouponApplied({
            couponId: result.coupon_id,
            discountAmount: result.discount_amount,
            couponCode: couponCode.toUpperCase()
          });
          
          setCouponCode("");
          
          toast({
            title: "Cupom aplicado!",
            description: `Desconto de ${formatCurrency(result.discount_amount)} aplicado com sucesso.`
          });
        } else {
          // Cupom inválido
          toast({
            variant: "destructive",
            title: "Cupom inválido",
            description: result.error_message || "Este cupom não pode ser aplicado."
          });
        }
      }
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao validar o cupom. Tente novamente."
      });
    } finally {
      setIsValidating(false);
    }
  };

  const removeCoupon = () => {
    onCouponRemoved();
    toast({
      title: "Cupom removido",
      description: "O desconto foi removido do seu pedido."
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      validateCoupon();
    }
  };

  return (
    <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Ticket className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-gray-700">Cupom de Desconto</span>
        </div>
        
        {appliedCoupon ? (
          // Cupom aplicado
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Cupom {appliedCoupon.couponCode} aplicado
                  </p>
                  <p className="text-xs text-green-600">
                    Desconto: {formatCurrency(appliedCoupon.discountAmount)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeCoupon}
                className="text-green-600 hover:text-green-800 hover:bg-green-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          // Input para aplicar cupom
          <div className="flex gap-2">
            <Input
              placeholder="Digite o código do cupom"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={isValidating}
            />
            <Button
              onClick={validateCoupon}
              disabled={isValidating || !couponCode.trim()}
              size="sm"
              className="px-4"
            >
              {isValidating ? "Validando..." : "Aplicar"}
            </Button>
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-2">
          💡 Dica: Cupons podem ter restrições de valor mínimo, horário ou quantidade de itens.
        </p>
      </CardContent>
    </Card>
  );
};

export default CouponInput;
