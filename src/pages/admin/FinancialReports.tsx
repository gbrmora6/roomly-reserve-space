import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar,
  Download,
  BarChart3,
  PieChart
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell } from 'recharts';
import { useBranchFilter } from "@/hooks/useBranchFilter";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const FinancialReports = () => {
  const { branchId } = useBranchFilter();
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const getPeriodDates = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case "current_month":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case "last_3_months":
        return {
          start: subMonths(startOfMonth(now), 2),
          end: endOfMonth(now)
        };
      case "custom":
        return {
          start: startDate ? parseISO(startDate) : startOfMonth(now),
          end: endDate ? parseISO(endDate) : endOfMonth(now)
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates();

  // Relatório de receitas
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["financial-revenue", branchId, periodStart, periodEnd],
    queryFn: async () => {
      if (!branchId) return null;

      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("total_price, created_at, status")
        .eq("branch_id", branchId)
        .gte("created_at", periodStart.toISOString())
        .lte("created_at", periodEnd.toISOString())
        .neq("status", "cancelled");

      const { data: equipmentBookings, error: equipmentError } = await supabase
        .from("booking_equipment")
        .select("total_price, created_at, status")
        .eq("branch_id", branchId)
        .gte("created_at", periodStart.toISOString())
        .lte("created_at", periodEnd.toISOString())
        .neq("status", "cancelled");

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total_amount, created_at, status")
        .eq("branch_id", branchId)
        .gte("created_at", periodStart.toISOString())
        .lte("created_at", periodEnd.toISOString())
        .eq("status", "paid");

      if (bookingsError || equipmentError || ordersError) {
        throw new Error("Erro ao buscar dados financeiros");
      }

      const roomRevenue = bookings?.reduce((sum, booking) => sum + Number(booking.total_price || 0), 0) || 0;
      const equipmentRevenue = equipmentBookings?.reduce((sum, booking) => sum + Number(booking.total_price || 0), 0) || 0;
      const productRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
      const totalRevenue = roomRevenue + equipmentRevenue + productRevenue;

      return {
        totalRevenue,
        roomRevenue,
        equipmentRevenue,
        productRevenue,
        totalBookings: (bookings?.length || 0) + (equipmentBookings?.length || 0),
        totalOrders: orders?.length || 0
      };
    },
    enabled: !!branchId
  });

  // Dados para gráfico de receitas por categoria
  const revenueByCategory = [
    { name: 'Salas', value: revenueData?.roomRevenue || 0, color: '#0088FE' },
    { name: 'Equipamentos', value: revenueData?.equipmentRevenue || 0, color: '#00C49F' },
    { name: 'Produtos', value: revenueData?.productRevenue || 0, color: '#FFBB28' }
  ].filter(item => item.value > 0);

  // Relatório de clientes mais ativos
  const { data: topClients, isLoading: clientsLoading } = useQuery({
    queryKey: ["top-clients", branchId, periodStart, periodEnd],
    queryFn: async () => {
      if (!branchId) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          user_id,
          total_price,
          profiles!inner(first_name, last_name, email)
        `)
        .eq("branch_id", branchId)
        .gte("created_at", periodStart.toISOString())
        .lte("created_at", periodEnd.toISOString())
        .neq("status", "cancelled");

      if (error) throw error;

      // Agrupar por cliente
      const clientStats = data?.reduce((acc: any, booking: any) => {
        const userId = booking.user_id;
        if (!acc[userId]) {
          acc[userId] = {
            id: userId,
            name: `${booking.profiles.first_name || ''} ${booking.profiles.last_name || ''}`.trim() || booking.profiles.email,
            email: booking.profiles.email,
            totalSpent: 0,
            bookingCount: 0
          };
        }
        acc[userId].totalSpent += Number(booking.total_price || 0);
        acc[userId].bookingCount += 1;
        return acc;
      }, {}) || {};

      return Object.values(clientStats)
        .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
        .slice(0, 10);
    },
    enabled: !!branchId
  });

  // Relatório de fluxo de caixa mensal
  const { data: cashFlowData, isLoading: cashFlowLoading } = useQuery({
    queryKey: ["cash-flow", branchId],
    queryFn: async () => {
      if (!branchId) return [];

      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), i);
        return {
          month: format(date, "MM/yyyy"),
          start: startOfMonth(date),
          end: endOfMonth(date)
        };
      }).reverse();

      const monthlyData = await Promise.all(
        last6Months.map(async ({ month, start, end }) => {
          const [bookings, equipmentBookings, orders] = await Promise.all([
            supabase
              .from("bookings")
              .select("total_price")
              .eq("branch_id", branchId)
              .gte("created_at", start.toISOString())
              .lte("created_at", end.toISOString())
              .neq("status", "cancelled"),
            supabase
              .from("booking_equipment")
              .select("total_price")
              .eq("branch_id", branchId)
              .gte("created_at", start.toISOString())
              .lte("created_at", end.toISOString())
              .neq("status", "cancelled"),
            supabase
              .from("orders")
              .select("total_amount")
              .eq("branch_id", branchId)
              .gte("created_at", start.toISOString())
              .lte("created_at", end.toISOString())
              .eq("status", "paid")
          ]);

          const roomRevenue = bookings.data?.reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0;
          const equipmentRevenue = equipmentBookings.data?.reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0;
          const productRevenue = orders.data?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;

          return {
            month,
            total: roomRevenue + equipmentRevenue + productRevenue,
            salas: roomRevenue,
            equipamentos: equipmentRevenue,
            produtos: productRevenue
          };
        })
      );

      return monthlyData;
    },
    enabled: !!branchId
  });

  const exportReport = () => {
    // Implementar exportação para PDF/Excel
  };

  if (!branchId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Selecione uma filial para visualizar os relatórios</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios Financeiros</h1>
          <p className="text-gray-600 mt-2">Análise detalhada do desempenho financeiro</p>
        </div>
        <Button onClick={exportReport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      {/* Filtros de período */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Período de Análise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">Mês Atual</SelectItem>
                  <SelectItem value="last_month">Mês Passado</SelectItem>
                  <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
                  <SelectItem value="custom">Período Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedPeriod === "custom" && (
              <>
                <div>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    placeholder="Data inicial"
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    placeholder="Data final"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Receita Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {revenueLoading ? "..." : `R$ ${revenueData?.totalRevenue.toFixed(2) || "0,00"}`}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Reservas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {revenueLoading ? "..." : revenueData?.totalBookings || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pedidos de Produtos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {revenueLoading ? "..." : revenueData?.totalOrders || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>   
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {revenueLoading ? "..." : `R$ ${((revenueData?.totalRevenue || 0) / Math.max((revenueData?.totalBookings || 0) + (revenueData?.totalOrders || 0), 1)).toFixed(2)}`}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Receita por categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Receita por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Tooltip formatter={(value: any) => [`R$ ${value.toFixed(2)}`, ""]} />
                  <RechartsPieChart data={revenueByCategory}>
                    {revenueByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </RechartsPieChart>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {revenueByCategory.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fluxo de caixa mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Fluxo de Caixa (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {cashFlowLoading ? (
                <div className="flex items-center justify-center h-full">
                  <span>Carregando...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`R$ ${value.toFixed(2)}`, ""]} />
                    <Bar dataKey="total" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clientes mais ativos */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clientes Mais Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {clientsLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <div className="space-y-4">
              {topClients?.map((client: any, index: number) => (
                <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-gray-500">{client.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">R$ {client.totalSpent.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{client.bookingCount} reservas</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialReports;