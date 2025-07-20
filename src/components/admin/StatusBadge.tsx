import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig = {
  "in_process": {
    label: "Em Processamento",
    variant: "secondary" as const,
    className: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    icon: Clock
  },
  "paid": {
    label: "Pago",
    variant: "default" as const,
    className: "bg-green-100 text-green-800 hover:bg-green-200",
    icon: CheckCircle
  },
  "partial_refunded": {
    label: "Parcialmente Devolvido",
    variant: "secondary" as const,
    className: "bg-orange-100 text-orange-800 hover:bg-orange-200",
    icon: Clock
  },
  "pre_authorized": {
    label: "Pré-autorizado",
    variant: "secondary" as const,
    className: "bg-purple-100 text-purple-800 hover:bg-purple-200",
    icon: Clock
  },
  "recused": {
    label: "Recusado",
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 hover:bg-red-200",
    icon: XCircle
  },
  // Status legados para compatibilidade
  "pago": {
    label: "Pago", 
    variant: "default" as const,
    className: "bg-green-100 text-green-800 hover:bg-green-200",
    icon: CheckCircle
  },
  "pending": {
    label: "Pendente",
    variant: "secondary" as const,
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    icon: Clock
  },
  "falta pagar": {
    label: "Falta pagar",
    variant: "secondary" as const,
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200", 
    icon: Clock
  },


  "cancelado por falta de pagamento": {
    label: "Cancelado por falta de pagamento",
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 hover:bg-red-200",
    icon: XCircle
  },
  "confirmed": {
    label: "Confirmado",
    variant: "default" as const,
    className: "bg-green-100 text-green-800 hover:bg-green-200",
    icon: CheckCircle
  },

};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    variant: "outline" as const,
    className: "bg-gray-100 text-gray-800",
    icon: AlertCircle
  };

  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className} flex items-center gap-1`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};