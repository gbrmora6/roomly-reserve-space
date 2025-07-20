import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AppliedCoupon {
  couponId: string;
  discountAmount: number;
  couponCode: string;
}

export const useCoupon = () => {
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const applyCoupon = useCallback((couponData: AppliedCoupon) => {
    setAppliedCoupon(couponData);
  }, []);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  const validateAndApplyCoupon = useCallback(async (
    couponCode: string,
    cartTotal: number,
    cartItemCount: number
  ): Promise<boolean> => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você precisa estar logado para aplicar cupons."
      });
      return false;
    }

    try {
      // Buscar cupom diretamente da tabela
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (couponError || !coupon) {
        toast({
          variant: "destructive",
          title: "Cupom inválido",
          description: "Cupom não encontrado ou inativo."
        });
        return false;
      }

      // Validações básicas
      if (new Date(coupon.valid_until) < new Date()) {
        toast({
          variant: "destructive",
          title: "Cupom expirado",
          description: "Este cupom já expirou."
        });
        return false;
      }

      if (cartTotal < coupon.minimum_amount) {
        toast({
          variant: "destructive",
          title: "Valor mínimo não atingido",
          description: `Valor mínimo para este cupom: ${coupon.minimum_amount}`
        });
        return false;
      }

      // Calcular desconto
      let discountAmount = 0;
      if (coupon.discount_type === 'fixed') {
        discountAmount = Math.min(coupon.discount_value, cartTotal);
      } else {
        discountAmount = (cartTotal * coupon.discount_value / 100);
      }

      applyCoupon({
        couponId: coupon.id,
        discountAmount: discountAmount,
        couponCode: couponCode.toUpperCase()
      });

      return true;
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao validar o cupom. Tente novamente."
      });
      return false;
    }
  }, [user, toast, applyCoupon]);

  const recordCouponUsage = useCallback(async (
    orderId: string,
    bookingId?: string,
    equipmentBookingId?: string
  ): Promise<boolean> => {
    if (!appliedCoupon || !user) {
      return false;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('branch_id')
        .eq('id', user.id)
        .single();

      if (!profile?.branch_id) {
        console.error('Branch ID não encontrado para o usuário');
        return false;
      }

      const { error } = await supabase
        .from('coupon_usage')
        .insert({
          coupon_id: appliedCoupon.couponId,
          user_id: user.id,
          branch_id: profile.branch_id,
          order_id: orderId,
          booking_id: bookingId || null,
          equipment_booking_id: equipmentBookingId || null,
          discount_applied: appliedCoupon.discountAmount
        });

      if (error) {
        console.error('Erro ao registrar uso do cupom:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao registrar uso do cupom:', error);
      return false;
    }
  }, [appliedCoupon, user]);

  const getDiscountedTotal = useCallback((originalTotal: number): number => {
    if (!appliedCoupon) {
      return originalTotal;
    }
    
    const discountedTotal = originalTotal - appliedCoupon.discountAmount;
    return Math.max(0, discountedTotal);
  }, [appliedCoupon]);

  const clearCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  return {
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    validateAndApplyCoupon,
    recordCouponUsage,
    getDiscountedTotal,
    clearCoupon,
    hasActiveCoupon: !!appliedCoupon,
    discountAmount: appliedCoupon?.discountAmount || 0
  };
};