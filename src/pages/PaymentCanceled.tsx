
import React from "react";
import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PaymentCanceled: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <XCircle className="mx-auto h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold mt-4">Pagamento cancelado</h1>
          <p className="text-muted-foreground mt-2">
            Seu pedido foi cancelado e você não será cobrado.
          </p>
        </div>

        <div className="p-4 mb-6 bg-muted/50 rounded-md">
          <p className="text-sm">
            Se você encontrou algum problema durante o processo de pagamento, entre em contato conosco para obter assistência.
          </p>
        </div>

        <div className="flex flex-col space-y-3">
          <Button asChild className="w-full">
            <Link to="/equipment">Voltar para equipamentos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Voltar para a página inicial</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCanceled;
