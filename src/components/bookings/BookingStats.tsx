import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

interface BookingStatsProps {
  bookings: any[];
  type: "room" | "equipment";
}

export const BookingStats = ({ bookings, type }: BookingStatsProps) => {
  const stats = React.useMemo(() => {
    const total = bookings.length;
    const paid = bookings.filter(b => b.status === "paid" || b.status === "confirmed").length;
    const pending = bookings.filter(b => b.status === "pending" || b.status === "awaiting_payment").length;
    const cancelled = bookings.filter(b => b.status === "cancelled" || b.status === "cancelled_due_to_payment").length;
    const totalValue = bookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0);
    const paidValue = bookings
      .filter(b => b.status === "paid" || b.status === "confirmed")
      .reduce((sum, booking) => sum + (booking.total_price || 0), 0);

    return {
      total,
      paid,
      pending,
      cancelled,
      totalValue,
      paidValue,
    };
  }, [bookings]);

  const getTitle = () => {
    return type === "room" ? "Resumo das Reservas de Salas" : "Resumo das Reservas de Equipamentos";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{getTitle()}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Reservas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalValue)} no total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.paidValue)} recebido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando pagamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">
              Reservas canceladas
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};