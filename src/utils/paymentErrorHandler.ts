import { PaymentError } from "@/components/payment/PaymentErrorCard";

export const parsePaymentError = (error: any, paymentMethod: string): PaymentError => {
  const errorMessage = error?.message || error?.error || "Erro desconhecido";
  const errorCode = error?.code || error?.error_code;

  // Erros específicos do cartão de crédito
  if (paymentMethod === "cartao") {
    if (errorMessage.includes("insufficient_funds") || errorMessage.includes("saldo insuficiente")) {
      return {
        type: 'card',
        code: 'insufficient_funds',
        title: "Saldo Insuficiente",
        message: "O cartão não possui saldo suficiente para esta transação.",
        suggestion: "Verifique o limite do seu cartão ou tente outro cartão de crédito.",
        canRetry: false,
        showChangeMethod: true
      };
    }

    if (errorMessage.includes("card_declined") || errorMessage.includes("cartão recusado")) {
      return {
        type: 'card',
        code: 'card_declined',
        title: "Cartão Recusado",
        message: "A operadora do cartão recusou a transação.",
        suggestion: "Entre em contato com seu banco ou tente outro cartão.",
        canRetry: false,
        showChangeMethod: true
      };
    }

    if (errorMessage.includes("invalid_cvv") || errorMessage.includes("cvv inválido")) {
      return {
        type: 'card',
        code: 'invalid_cvv',
        title: "CVV Inválido",
        message: "O código de segurança (CVV) informado está incorreto.",
        suggestion: "Verifique o código de 3 dígitos no verso do cartão.",
        canRetry: true,
        showChangeMethod: false
      };
    }

    if (errorMessage.includes("expired_card") || errorMessage.includes("cartão vencido")) {
      return {
        type: 'card',
        code: 'expired_card',
        title: "Cartão Vencido",
        message: "O cartão informado está vencido.",
        suggestion: "Use um cartão válido ou escolha outro método de pagamento.",
        canRetry: false,
        showChangeMethod: true
      };
    }

    if (errorMessage.includes("invalid_card") || errorMessage.includes("número inválido")) {
      return {
        type: 'card',
        code: 'invalid_card',
        title: "Número do Cartão Inválido",
        message: "O número do cartão informado é inválido.",
        suggestion: "Verifique se digitou o número corretamente.",
        canRetry: true,
        showChangeMethod: false
      };
    }

    // Erro genérico de cartão
    return {
      type: 'card',
      code: 'card_error',
      title: "Erro no Cartão de Crédito",
      message: errorMessage,
      suggestion: "Verifique os dados do cartão ou tente outro método de pagamento.",
      canRetry: true,
      showChangeMethod: true
    };
  }

  // Erros específicos do PIX
  if (paymentMethod === "pix") {
    if (errorMessage.includes("PIX_UNAVAILABLE") || errorMessage.includes("pix indisponível")) {
      return {
        type: 'pix',
        code: 'pix_unavailable',
        title: "PIX Temporariamente Indisponível",
        message: "O serviço PIX está instável no momento.",
        suggestion: "Tente novamente em alguns minutos ou use cartão de crédito/boleto.",
        canRetry: true,
        showChangeMethod: true
      };
    }

    if (errorMessage.includes("pix_expired") || errorMessage.includes("expirado")) {
      return {
        type: 'pix',
        code: 'pix_expired',
        title: "PIX Expirado",
        message: "O código PIX expirou e não pode mais ser usado.",
        suggestion: "Gere um novo código PIX ou escolha outro método de pagamento.",
        canRetry: true,
        showChangeMethod: true
      };
    }

    if (errorMessage.includes("pix_limit") || errorMessage.includes("limite")) {
      return {
        type: 'pix',
        code: 'pix_limit',
        title: "Limite PIX Excedido",
        message: "O valor excede o limite diário para transações PIX.",
        suggestion: "Tente dividir o pagamento ou use cartão de crédito.",
        canRetry: false,
        showChangeMethod: true
      };
    }

    // Erro genérico de PIX
    return {
      type: 'pix',
      code: 'pix_error',
      title: "Erro no Pagamento PIX",
      message: errorMessage,
      suggestion: "Tente gerar um novo código PIX ou escolha outro método.",
      canRetry: true,
      showChangeMethod: true
    };
  }

  // Erros específicos do boleto
  if (paymentMethod === "boleto") {
    if (errorMessage.includes("valor mínimo")) {
      return {
        type: 'boleto',
        code: 'minimum_value',
        title: "Valor Mínimo Não Atingido",
        message: "O valor mínimo para boleto é R$ 30,00.",
        suggestion: "Adicione mais itens ao carrinho ou escolha PIX/cartão.",
        canRetry: false,
        showChangeMethod: true
      };
    }

    if (errorMessage.includes("boleto_generation_failed")) {
      return {
        type: 'boleto',
        code: 'generation_failed',
        title: "Erro na Geração do Boleto",
        message: "Não foi possível gerar o boleto no momento.",
        suggestion: "Tente novamente ou escolha outro método de pagamento.",
        canRetry: true,
        showChangeMethod: true
      };
    }

    // Erro genérico de boleto
    return {
      type: 'boleto',
      code: 'boleto_error',
      title: "Erro no Boleto",
      message: errorMessage,
      suggestion: "Tente gerar novamente ou escolha outro método.",
      canRetry: true,
      showChangeMethod: true
    };
  }

  // Erros de conectividade
  if (errorMessage.includes("503") || errorMessage.includes("timeout") || errorMessage.includes("network")) {
    return {
      type: 'general',
      code: 'connectivity',
      title: "Problema de Conexão",
      message: "Não foi possível conectar com o serviço de pagamento.",
      suggestion: "Verifique sua conexão com a internet e tente novamente.",
      canRetry: true,
      showChangeMethod: false
    };
  }

  // Erro genérico
  return {
    type: 'general',
    code: 'unknown',
    title: "Erro no Pagamento",
    message: errorMessage,
    suggestion: "Tente novamente ou entre em contato com o suporte.",
    canRetry: true,
    showChangeMethod: true
  };
};

export const getPaymentMethodName = (method: string): string => {
  switch (method) {
    case 'cartao':
      return 'Cartão de Crédito';
    case 'pix':
      return 'PIX';
    case 'boleto':
      return 'Boleto';
    default:
      return 'Pagamento';
  }
};