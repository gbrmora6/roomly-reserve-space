import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PaymentData } from "@/types/payment";
import { toast } from "sonner";

const initialPaymentData: PaymentData = {
  nome: "",
  email: "",
  cpf: "",
  telefone: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  numeroCartao: "",
  nomeNoCartao: "",
  validadeCartao: "",
  cvv: "",
  parcelas: 1
};

export const useCheckout = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData>(initialPaymentData);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalTotal, setFinalTotal] = useState(cartTotal);

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate("/");
      return;
    }

    if (user) {
      setPaymentData(prev => ({
        ...prev,
        nome: user.user_metadata?.full_name || "",
        email: user.email || ""
      }));
    }
  }, [cartItems, navigate, user]);

  useEffect(() => {
    setFinalTotal(cartTotal - discountAmount);
  }, [cartTotal, discountAmount]);

  const handlePaymentDataChange = (field: keyof PaymentData, value: any) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressFromCep = (address: any) => {
    setPaymentData(prev => ({
      ...prev,
      rua: address.logradouro || "",
      bairro: address.bairro || "",
      cidade: address.localidade || "",
      estado: address.uf || ""
    }));
  };

  const validateForm = () => {
    const requiredFields = [
      "nome", "email", "cpf", "telefone", "cep", "rua", 
      "numero", "bairro", "cidade", "estado"
    ];

    for (const field of requiredFields) {
      if (!paymentData[field as keyof PaymentData]) {
        toast.error(`Por favor, preencha o campo ${field}`);
        return false;
      }
    }

    if (paymentMethod === "cartao") {
      const cardFields = ["numeroCartao", "nomeNoCartao", "validadeCartao", "cvv"];
      for (const field of cardFields) {
        if (!paymentData[field as keyof PaymentData]) {
          toast.error(`Por favor, preencha o campo ${field}`);
          return false;
        }
      }
    }

    return true;
  };

  const registerCouponUsage = async (couponId: string) => {
    try {
      // Get user's branch_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('branch_id')
        .eq('id', user?.id)
        .single();

      await supabase.from("coupon_usage").insert({
        coupon_id: couponId,
        user_id: user?.id,
        branch_id: profile?.branch_id || null,
        discount_applied: discountAmount
      });
    } catch (error) {
      console.error("Erro ao registrar uso do cupom:", error);
    }
  };

  const processPayment = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {

      const paymentPayload = {
        action: "create-checkout",
        userId: user?.id,
        paymentMethod: paymentMethod,
        paymentData: {
          nomeCompleto: paymentData.nome,
          email: paymentData.email,
          cpfCnpj: paymentData.cpf.replace(/\D/g, ""),
          telefone: paymentData.telefone.replace(/\D/g, ""),
          cep: paymentData.cep.replace(/\D/g, ""),
          rua: paymentData.rua,
          numero: paymentData.numero,
          complemento: paymentData.complemento || "",
          bairro: paymentData.bairro,
          cidade: paymentData.cidade,
          estado: paymentData.estado,
          // Dados do cartão para tokenização (enviados apenas se for cartão)
          numeroCartao: paymentMethod === "cartao" ? paymentData.numeroCartao : "",
          nomeNoCartao: paymentMethod === "cartao" ? paymentData.nomeNoCartao : "",
          validadeCartao: paymentMethod === "cartao" ? paymentData.validadeCartao : "",
          cvv: paymentMethod === "cartao" ? paymentData.cvv : "",
          parcelas: paymentData.parcelas || 1
        }
      };

      const { data, error } = await supabase.functions.invoke("click2pay-integration", {
        body: paymentPayload
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Erro no processamento do pagamento");
      }

      if (appliedCoupon) {
        await registerCouponUsage(appliedCoupon.id);
      }

      // Não limpar carrinho aqui - será limpo pelo webhook após confirmação do pagamento

      if (paymentMethod === "pix" && data.pix) {
        navigate("/payment-instructions", {
          state: {
            paymentMethod: "pix",
            qrCode: data.pix.qr_code,
            qrCodeImage: data.pix.qr_code_image,
            amount: finalTotal,
            transactionId: data.tid,
            expiresAt: data.pix.expires_at
          }
        });
      } else if (paymentMethod === "boleto" && data.boleto) {
        navigate("/payment-instructions", {
          state: {
            paymentMethod: "boleto",
            boletoUrl: data.boleto.url,
            barcode: data.boleto.barcode,
            dueDate: data.boleto.due_date,
            amount: finalTotal,
            transactionId: data.tid
          }
        });
      } else if (paymentMethod === "cartao" && (data.status === "paid" || data.status === "approved")) {
        navigate("/payment-success", {
          state: {
            transactionId: data.tid,
            amount: finalTotal,
            authorizationCode: data.card?.authorization_code
          }
        });
      } else {
        throw new Error("Resposta inesperada da API de pagamento");
      }
    } catch (error: any) {
      console.error("Erro no checkout:", error);
      toast.error(error.message || "Erro ao processar pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    paymentData,
    paymentMethod,
    appliedCoupon,
    discountAmount,
    finalTotal,
    cartItems,
    cartTotal,
    setPaymentData,
    setPaymentMethod,
    setAppliedCoupon,
    setDiscountAmount,
    handlePaymentDataChange,
    handleAddressFromCep,
    processPayment
  };
};