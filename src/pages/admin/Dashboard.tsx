import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, BookOpen, Mic, Bed as BedIcon, Users, Calendar, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { devLog } from "@/utils/logger";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AdminDashboard: React.FC = () => {
  const { refreshUserClaims } = useAuth();
  const { branchId, setBranchId, branches, isSuperAdmin } = useBranchFilter();
  
  // Execute refresh claims on component mount
  useEffect(() => {
    devLog("AdminDashboard component mounted, refreshing user claims");
    const refreshClaims = async () => {
      await refreshUserClaims();
    };
    refreshClaims();
  }, [refreshUserClaims]);

  const { data: roomsCount, isLoading: roomsLoading } = useQuery({
    queryKey: ["roomsCount", branchId],
    queryFn: async () => {
      if (!branchId) return 0;
      devLog("Fetching rooms count");
      const { count, error } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .eq("branch_id", branchId);
      if (error) {
        throw error;
      }
      devLog("Rooms count received", count);
      return count || 0;
    },
    enabled: !!branchId
  });

  const { data: equipmentCount, isLoading: equipmentLoading } = useQuery({
    queryKey: ["equipmentCount", branchId],
    queryFn: async () => {
      if (!branchId) return 0;
      devLog("Fetching equipment count");
      const { count, error } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .eq("branch_id", branchId);
      if (error) {
        throw error;
      }
      devLog("Equipment count received", count);
      return count || 0;
    },
    enabled: !!branchId
  });

  const { data: bookingsCount, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookingsCount", branchId],
    queryFn: async () => {
      if (!branchId) return 0;
      devLog("Fetching bookings count");
      const { count, error } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("branch_id", branchId);
      if (error) {
        throw error;
      }
      devLog("Bookings count received", count);
      return count || 0;
    },
    enabled: !!branchId
  });

  const { data: clientsCount, isLoading: clientsLoading } = useQuery({
    queryKey: ["clientsCount", branchId],
    queryFn: async () => {
      if (!branchId) return 0;
      devLog("Fetching clients count");
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "client")
        .eq("branch_id", branchId);
      if (error) {
        throw error;
      }
      devLog("Clients count received", count);
      return count || 0;
    },
    enabled: !!branchId
  });

  const { data: recentBookings, isLoading: recentBookingsLoading } = useQuery({
    queryKey: ["recentBookings", branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time, total_price, status")
        .gte("start_time", thirtyDaysAgo)
        .eq("branch_id", branchId)
        .order("start_time");
      
      if (error) {
        throw error;
      }
      
      // Group bookings by date
      const bookingsByDate: Record<string, { total: number, count: number }> = {};
      data?.forEach(booking => {
        const date = format(new Date(booking.start_time), "dd/MM", { locale: ptBR });
        
        if (!bookingsByDate[date]) {
          bookingsByDate[date] = { total: 0, count: 0 };
        }
        
        if (booking.status !== "cancelled") {
          bookingsByDate[date].total += Number(booking.total_price);
          bookingsByDate[date].count += 1;
        }
      });
      
      // Transform to chart data format
      return Object.entries(bookingsByDate).map(([date, stats]) => ({
        date,
        valor: parseFloat(stats.total.toFixed(2)),
        reservas: stats.count
      })).slice(-14); // Last 14 days
    },
    enabled: !!branchId
  });

  const { data: monthlyRevenue, isLoading: monthlyRevenueLoading } = useQuery({
    queryKey: ["monthlyRevenue", branchId],
    queryFn: async () => {
      if (!branchId) return 0;
      const startOfCurrentMonth = startOfMonth(new Date()).toISOString();
      const endOfCurrentMonth = endOfMonth(new Date()).toISOString();
      const { data, error } = await supabase
        .from("bookings")
        .select("total_price")
        .gte("start_time", startOfCurrentMonth)
        .lte("start_time", endOfCurrentMonth)
        .neq("status", "cancelled")
        .eq("branch_id", branchId);
      if (error) {
        throw error;
      }
      const total = data?.reduce((sum, booking) => sum + Number(booking.total_price), 0) || 0;
      return total;
    },
    enabled: !!branchId
  });

  devLog("AdminDashboard render state", { roomsLoading, equipmentLoading, bookingsLoading });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 pb-10">
      {isSuperAdmin && branches && (
        <div className="mb-4 max-w-xs">
          <Select value={branchId || undefined} onValueChange={setBranchId!}>
            <SelectTrigger>
              <SelectValue placeholder="Filial" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2 mt-4 tracking-tight">Painel Administrativo</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="shadow-lg rounded-2xl border-0 bg-white flex flex-row items-center gap-4 p-4">
          <div className="bg-blue-100 rounded-xl p-3 flex items-center justify-center">
            <BedIcon className="h-8 w-8 text-blue-700" />
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">{roomsLoading ? <Skeleton className="h-8 w-16" /> : roomsCount}</div>
            <div className="text-sm text-gray-500 font-medium mt-1">Salas</div>
          </div>
        </Card>
        <Card className="shadow-lg rounded-2xl border-0 bg-white flex flex-row items-center gap-4 p-4">
          <div className="bg-green-100 rounded-xl p-3 flex items-center justify-center">
            <Mic className="h-8 w-8 text-green-700" />
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">{equipmentLoading ? <Skeleton className="h-8 w-16" /> : equipmentCount}</div>
            <div className="text-sm text-gray-500 font-medium mt-1">Equipamentos</div>
          </div>
        </Card>
        <Card className="shadow-lg rounded-2xl border-0 bg-white flex flex-row items-center gap-4 p-4">
          <div className="bg-purple-100 rounded-xl p-3 flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-purple-700" />
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">{bookingsLoading ? <Skeleton className="h-8 w-16" /> : bookingsCount}</div>
            <div className="text-sm text-gray-500 font-medium mt-1">Reservas</div>
          </div>
        </Card>
        <Card className="shadow-lg rounded-2xl border-0 bg-white flex flex-row items-center gap-4 p-4">
          <div className="bg-yellow-100 rounded-xl p-3 flex items-center justify-center">
            <Users className="h-8 w-8 text-yellow-700" />
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">{clientsLoading ? <Skeleton className="h-8 w-16" /> : clientsCount}</div>
            <div className="text-sm text-gray-500 font-medium mt-1">Clientes</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <Card className="md:col-span-2 shadow-lg rounded-2xl border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center text-lg font-bold text-gray-800">
              <Calendar className="mr-2 h-6 w-6 text-blue-700" />
              Reservas e Faturamento (14 dias)
            </CardTitle>
            <CardDescription className="text-gray-500">
              Visão dos últimos 14 dias de atividade
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {recentBookingsLoading ? (
              <div className="h-full flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={recentBookings}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip 
                    formatter={(value: any, name: any) => {
                      if (name === 'valor') return [`R$ ${value}`, 'Valor'];
                      return [value, 'Reservas'];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="valor" name="Valor" fill="#8884d8" radius={[8,8,0,0]} />
                  <Bar yAxisId="right" dataKey="reservas" name="Reservas" fill="#82ca9d" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-lg rounded-2xl border-0 bg-white flex flex-col items-center justify-center">
          <CardHeader>
            <CardTitle className="flex items-center text-lg font-bold text-gray-800">
              <TrendingUp className="mr-2 h-6 w-6 text-green-700" />
              Faturamento Mensal
            </CardTitle>
            <CardDescription className="text-gray-500">
              Mês atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyRevenueLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl font-extrabold text-green-700">
                  R$ {monthlyRevenue?.toFixed(2)}
                </div>
                <p className="text-muted-foreground mt-2 text-base">
                  {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted rounded-2xl p-8 mt-8 shadow-sm border-0">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Bem-vindo ao Painel Administrativo</h2>
        <p className="text-muted-foreground text-lg">
          Use o menu lateral para navegar entre as diferentes seções do sistema.<br />
          Aqui você pode gerenciar salas, equipamentos e reservas.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
