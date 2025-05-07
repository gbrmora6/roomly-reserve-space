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

const AdminDashboard: React.FC = () => {
  const { refreshUserClaims } = useAuth();
  
  // Execute refresh claims on component mount
  useEffect(() => {
    devLog("AdminDashboard component mounted, refreshing user claims");
    const refreshClaims = async () => {
      await refreshUserClaims();
    };
    refreshClaims();
  }, [refreshUserClaims]);

  const { data: roomsCount, isLoading: roomsLoading } = useQuery({
    queryKey: ["roomsCount"],
    queryFn: async () => {
      devLog("Fetching rooms count");
      const { count, error } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true });
      
      if (error) {
        throw error;
      }
      
      devLog("Rooms count received", count);
      return count || 0;
    },
  });

  const { data: equipmentCount, isLoading: equipmentLoading } = useQuery({
    queryKey: ["equipmentCount"],
    queryFn: async () => {
      devLog("Fetching equipment count");
      const { count, error } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true });
      
      if (error) {
        throw error;
      }
      
      devLog("Equipment count received", count);
      return count || 0;
    },
  });

  const { data: bookingsCount, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookingsCount"],
    queryFn: async () => {
      devLog("Fetching bookings count");
      const { count, error } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true });
      
      if (error) {
        throw error;
      }
      
      devLog("Bookings count received", count);
      return count || 0;
    },
  });

  const { data: clientsCount, isLoading: clientsLoading } = useQuery({
    queryKey: ["clientsCount"],
    queryFn: async () => {
      devLog("Fetching clients count");
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "client");
      
      if (error) {
        throw error;
      }
      
      devLog("Clients count received", count);
      return count || 0;
    },
  });

  const { data: recentBookings, isLoading: recentBookingsLoading } = useQuery({
    queryKey: ["recentBookings"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time, total_price, status")
        .gte("start_time", thirtyDaysAgo)
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
  });

  const { data: monthlyRevenue, isLoading: monthlyRevenueLoading } = useQuery({
    queryKey: ["monthlyRevenue"],
    queryFn: async () => {
      const startOfCurrentMonth = startOfMonth(new Date()).toISOString();
      const endOfCurrentMonth = endOfMonth(new Date()).toISOString();
      
      const { data, error } = await supabase
        .from("bookings")
        .select("total_price")
        .gte("start_time", startOfCurrentMonth)
        .lte("start_time", endOfCurrentMonth)
        .neq("status", "cancelled");
      
      if (error) {
        throw error;
      }
      
      const total = data?.reduce((sum, booking) => sum + Number(booking.total_price), 0) || 0;
      return total;
    },
  });

  devLog("AdminDashboard render state", { roomsLoading, equipmentLoading, bookingsLoading });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Painel Administrativo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <BedIcon className="mr-2 h-4 w-4" /> Salas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roomsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{roomsCount}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Mic className="mr-2 h-4 w-4" /> Equipamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {equipmentLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{equipmentCount}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <BookOpen className="mr-2 h-4 w-4" /> Reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{bookingsCount}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Users className="mr-2 h-4 w-4" /> Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{clientsCount}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Reservas e Faturamento (14 dias)
            </CardTitle>
            <CardDescription>
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
                  <Bar yAxisId="left" dataKey="valor" name="Valor" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="reservas" name="Reservas" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Faturamento Mensal
            </CardTitle>
            <CardDescription>
              Mês atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyRevenueLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl font-bold text-primary">
                  R$ {monthlyRevenue?.toFixed(2)}
                </div>
                <p className="text-muted-foreground mt-2">
                  {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted rounded-lg p-6 mt-4">
        <h2 className="text-xl font-bold mb-4">Bem-vindo ao Painel Administrativo</h2>
        <p className="text-muted-foreground">
          Use o menu lateral para navegar entre as diferentes seções do sistema. 
          Aqui você pode gerenciar salas, equipamentos e reservas.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
