import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/ui/main-layout";
import { PaymentErrorCard, type PaymentError } from "@/components/payment/PaymentErrorCard";
import { parsePaymentError } from "@/utils/paymentErrorHandler";

const PaymentError: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { error, paymentMethod, canRetry = true } = location.state || {};
  
  // Parse do erro para formato estruturado
  const paymentError: PaymentError = error 
    ? parsePaymentError(error, paymentMethod || "general")
    : {
        type: 'general',
        title: "Erro no Pagamento",
        message: "Ocorreu um erro durante o processamento do pagamento.",
        suggestion: "Tente novamente ou escolha outro método de pagamento.",
        canRetry: true,
        showChangeMethod: true
      };

  const handleRetry = () => {
    navigate("/checkout");
  };

  const handleChangeMethod = () => {
    navigate("/checkout", { 
      state: { 
        scrollToPaymentMethod: true 
      } 
    });
  };

  const handleGoBack = () => {
    navigate("/cart");
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <PaymentErrorCard
            error={paymentError}
            onRetry={canRetry ? handleRetry : undefined}
            onChangeMethod={handleChangeMethod}
            onGoBack={handleGoBack}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default PaymentError;