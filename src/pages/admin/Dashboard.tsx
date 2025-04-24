
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard: React.FC = () => {
  const { data: roomsCount } = useQuery({
    queryKey: ["roomsCount"],
    queryFn: async () => {
      const { count } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: equipmentCount } = useQuery({
    queryKey: ["equipmentCount"],
    queryFn: async () => {
      const { count } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: bookingsCount } = useQuery({
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Salas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{roomsCount ?? "..."}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Equipamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{equipmentCount ?? "..."}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{bookingsCount ?? "..."}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
