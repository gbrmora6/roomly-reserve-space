import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig = {
  "paid": {
    label: "Pago",
    variant: "default" as const,
    className: "bg-green-100 text-green-800 hover:bg-green-200",
    icon: CheckCircle
  },
  "pago": {
    label: "Pago", 
    variant: "default" as const,
    className: "bg-green-100 text-green-800 hover:bg-green-200",
    icon: CheckCircle
  },
  "pending": {
    label: "Falta pagar",
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
  "awaiting_payment": {
    label: "Falta pagar",
    variant: "secondary" as const,
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    icon: Clock
  },
  "cancelled": {
    label: "Cancelado por falta de pagamento",
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 hover:bg-red-200",
    icon: XCircle
  },
  "cancelled_due_to_payment": {
    label: "Cancelado por falta de pagamento",
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 hover:bg-red-200",
    icon: XCircle
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
    className: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    icon: CheckCircle
  },
  "cancelled_unpaid": {
    label: "Cancelado por falta de pagamento",
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 hover:bg-red-200",
    icon: XCircle
  }
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