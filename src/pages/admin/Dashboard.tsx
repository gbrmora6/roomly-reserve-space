
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, BookOpen, Mic } from "lucide-react";

const AdminDashboard: React.FC = () => {
  const { data: roomsCount, isLoading: roomsLoading } = useQuery({
    queryKey: ["roomsCount"],
    queryFn: async () => {
      const { count } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: equipmentCount, isLoading: equipmentLoading } = useQuery({
    queryKey: ["equipmentCount"],
    queryFn: async () => {
      const { count } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: bookingsCount, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookingsCount"],
    queryFn: async () => {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Bed className="mr-2 h-4 w-4" /> Salas
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
      </div>

      <div className="bg-muted rounded-lg p-6 mt-8">
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
