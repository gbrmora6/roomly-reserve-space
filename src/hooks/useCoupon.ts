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
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: couponCode.toUpperCase(),
        p_user_id: user.id,
        p_total_amount: cartTotal,
        p_item_count: cartItemCount,
        p_applicable_type: 'all'
      });

      if (error) {
        console.error('Erro ao validar cupom:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro interno ao validar o cupom. Tente novamente."
        });
        return false;
      }

      if (data && data.length > 0) {
        const result = data[0];
        
        if (result.is_valid) {
          applyCoupon({
            couponId: result.coupon_id,
            discountAmount: result.discount_amount,
            couponCode: couponCode.toUpperCase()
          });
          return true;
        } else {
          toast({
            variant: "destructive",
            title: "Cupom inválido",
            description: result.error_message || "Este cupom não pode ser aplicado."
          });
          return false;
        }
      }
      
      return false;
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
      // Obter branch_id do usuário
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
    return Math.max(0, discountedTotal); // Garantir que não seja negativo
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