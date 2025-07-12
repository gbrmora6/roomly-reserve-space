import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle,
  TrendingUp
} from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

interface PaymentStatsProps {
  orders: any[];
}

export function PaymentStats({ orders }: PaymentStatsProps) {
  const stats = {
    total: orders.length,
    paid: orders.filter(o => o.status === 'paid').length,
    pending: orders.filter(o => o.status === 'in_process').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalAmount: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    paidAmount: orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + (o.total_amount || 0), 0),
  };

  const statCards = [
    {
      title: "Total de Pedidos",
      value: stats.total,
      icon: TrendingUp,
      color: "text-blue-600"
    },
    {
      title: "Pagos",
      value: stats.paid,
      icon: CheckCircle2,
      color: "text-green-600"
    },
    {
      title: "Pendentes",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600"
    },
    {
      title: "Cancelados",
      value: stats.cancelled,
      icon: XCircle,
      color: "text-red-600"
    }
  ];

  if (orders.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {index === 0 && stats.totalAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total: {formatCurrency(stats.totalAmount)}
                </p>
              )}
              {index === 1 && stats.paidAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Valor: {formatCurrency(stats.paidAmount)}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}