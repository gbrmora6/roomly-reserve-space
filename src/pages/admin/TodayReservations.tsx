
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, User, Package } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { useBranchFilter } from "@/hooks/useBranchFilter";

export default function TodayReservations() {
  const { branchId } = useBranchFilter();
  const [searchTerm, setSearchTerm] = useState("");
  const today = new Date();

  const { data: todayData = [], isLoading } = useQuery({
    queryKey: ["today-reservations", branchId],
    queryFn: async () => {
      if (!branchId) return [];
      
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      // Buscar reservas de salas do dia
      const { data: roomBookings, error: roomError } = await supabase
        .from("bookings")
        .select(`
          *,
          room:rooms(name),
          user:profiles!bookings_user_id_fkey(first_name, last_name, email)
        `)
        .eq("branch_id", branchId)
        .gte("start_time", startOfToday)
        .lte("start_time", endOfToday)
        .in("status", ["confirmed"]);

      if (roomError) throw roomError;

      // Buscar reservas de equipamentos do dia
      const { data: equipmentBookings, error: equipmentError } = await supabase
        .from("booking_equipment")
        .select(`
          *,
          equipment(name),
          user:profiles!booking_equipment_user_id_fkey(first_name, last_name, email)
        `)
        .eq("branch_id", branchId)
        .gte("start_time", startOfToday)
        .lte("start_time", endOfToday)
        .in("status", ["confirmed"]);

      if (equipmentError) throw equipmentError;

      // Buscar pedidos do dia
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(quantity, product:products(name)),
          user:profiles!orders_user_id_fkey(first_name, last_name, email)
        `)
        .eq("branch_id", branchId)
        .gte("created_at", startOfToday)
        .lte("created_at", endOfToday)
        .eq("status", "confirmed");

      if (ordersError) throw ordersError;

      // Combinar todos os dados
      const allReservations = [
        ...(roomBookings || []).map(booking => ({
          ...booking,
          type: "room" as const,
          title: booking.room?.name || "Sala",
          time: booking.start_time,
          details: `${format(new Date(booking.start_time), "HH:mm")} - ${format(new Date(booking.end_time), "HH:mm")}`
        })),
        ...(equipmentBookings || []).map(booking => ({
          ...booking,
          type: "equipment" as const,
          title: booking.equipment?.name || "Equipamento",
          time: booking.start_time,
          details: `${booking.quantity}x - ${format(new Date(booking.start_time), "HH:mm")} - ${format(new Date(booking.end_time), "HH:mm")}`
        })),
        ...(orders || []).map(order => ({
          ...order,
          type: "order" as const,
          title: "Compra de Produtos",
          time: order.created_at,
          details: order.order_items?.map((item: any) => `${item.quantity}x ${item.product?.name}`).join(", ") || ""
        }))
      ];

      return allReservations.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    },
    enabled: !!branchId,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const filteredData = todayData.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    
    // Verificar se user existe e tem as propriedades esperadas
    const userName = item.user && typeof item.user === 'object' && 'first_name' in item.user && 'last_name' in item.user
      ? `${item.user.first_name || ""} ${item.user.last_name || ""}`.toLowerCase()
      : "";
    
    const userEmail = item.user && typeof item.user === 'object' && 'email' in item.user
      ? (item.user.email || "").toLowerCase()
      : "";
    
    const title = item.title?.toLowerCase() || "";
    
    return userName.includes(searchLower) || 
           userEmail.includes(searchLower) || 
           title.includes(searchLower);
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "room":
        return <Calendar className="h-4 w-4" />;
      case "equipment":
        return <Clock className="h-4 w-4" />;
      case "order":
        return <Package className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; variant: any }> = {
      room: { label: "Sala", variant: "default" },
      equipment: { label: "Equipamento", variant: "secondary" },
      order: { label: "Produto", variant: "outline" },
    };

    const typeInfo = typeMap[type] || { label: type, variant: "secondary" };
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
  };

  const getUserName = (user: any) => {
    if (!user || typeof user !== 'object') return "Usuário não encontrado";
    if (!('first_name' in user) || !('last_name' in user)) return "Usuário não encontrado";
    return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Usuário não encontrado";
  };

  const getUserEmail = (user: any) => {
    if (!user || typeof user !== 'object') return "";
    if (!('email' in user)) return "";
    return user.email || "";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Reservas de Hoje - {format(today, "dd/MM/yyyy")}
            </CardTitle>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {filteredData.length} reservas
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Buscar por nome, email ou item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={`${item.type}-${item.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {getUserName(item.user)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getUserEmail(item.user)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      {getTypeBadge(item.type)}
                    </div>
                  </TableCell>
                  <TableCell>{item.title}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {item.details}
                  </TableCell>
                  <TableCell>
                    {item.type === "order" 
                      ? format(new Date(item.time), "HH:mm")
                      : item.details
                    }
                  </TableCell>
                  <TableCell>
                    R$ {"total_price" in item ? (item.total_price?.toFixed(2) || "0,00") : 
                        "total_amount" in item ? (item.total_amount?.toFixed(2) || "0,00") : "0,00"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      Confirmado
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredData.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm 
                ? "Nenhuma reserva encontrada com os critérios de busca."
                : "Nenhuma reserva confirmada para hoje."
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
