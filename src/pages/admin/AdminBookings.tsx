import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BookOpen, Download, Eye } from "lucide-react";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PaymentStatusManager } from "@/components/admin/PaymentStatusManager";
import * as XLSX from "xlsx";
import { format } from "date-fns";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingWithDetails {
  id: string;
  user_id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  created_at: string;
  total_price: number;
  user?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  room?: {
    name: string;
    price_per_hour: number;
  } | null;
  payment_method?: string;
  payment_data?: any;
  orders?: {
    id: string;
    status: string;
    payment_method: string;
    payment_details: any[];
  }[];
}

const AdminBookings = () => {
  const [activeTab, setActiveTab] = useState<BookingStatus | "all">("all");
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;
  
  const { branchId, setBranchId, branches, isSuperAdmin } = useBranchFilter();
  const { toast } = useToast();

  const { data: bookings = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-room-bookings", activeTab, branchId],
    queryFn: async () => {
      if (!branchId) return [];
      
      let query = supabase
        .from("bookings")
        .select(`
          id,
          user_id,
          room_id,
          start_time,
          end_time,
          status,
          created_at,
          total_price,
          room:rooms(name, price_per_hour)
        `)
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles and orders separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(booking => booking.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds);

        // Buscar pedidos relacionados
        const bookingIds = data.map(b => b.id);
        const { data: orders } = await supabase
          .from("orders")
          .select(`
            id,
            status,
            payment_method,
            payment_details(*)
          `)
          .in("id", bookingIds); // Assumindo que há uma relação entre orders e bookings

        return data.map(booking => ({
          ...booking,
          user: profiles?.find(profile => profile.id === booking.user_id) || null,
          orders: orders?.filter(order => order.id === booking.id) || []
        })) as BookingWithDetails[];
      }

      return data as BookingWithDetails[] || [];
    },
    enabled: !!branchId,
    refetchInterval: 30000,
  });

  // Cálculos de resumo
  const stats = useMemo(() => {
    if (!bookings) return { total: 0, pagas: 0, pendentes: 0, canceladas: 0 };
    
    let total = bookings.length;
    let pagas = 0;
    let pendentes = 0;
    let canceladas = 0;

    bookings.forEach(booking => {
      if (booking.status === "confirmed" || booking.status === "pago") {
        pagas++;
      } else if (booking.status === "pending" || booking.status === "falta pagar") {
        pendentes++;
      } else if (booking.status === "cancelled" || booking.status === "cancelled_unpaid" || booking.status === "cancelado por falta de pagamento") {
        canceladas++;
      }
    });

    return { total, pagas, pendentes, canceladas };
  }, [bookings]);

  // Filtro de busca
  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (!search.trim()) return bookings;
    const s = search.trim().toLowerCase();
    return bookings.filter(booking => {
      const user = booking.user;
      const name = user ? `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase() : "";
      const roomName = booking.room?.name?.toLowerCase() || "";
      return name.includes(s) || roomName.includes(s);
    });
  }, [bookings, search]);

  // Paginação
  const totalPages = Math.ceil(filteredBookings.length / perPage) || 1;
  const paginatedBookings = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredBookings.slice(start, start + perPage);
  }, [filteredBookings, page]);

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", id);
      
      if (error) throw error;
      
      toast({
        title: "Status atualizado com sucesso",
      });
      
      refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: err.message,
      });
    }
  };

  const downloadReport = () => {
    if (!bookings || bookings.length === 0) {
      toast({
        title: "Sem dados para exportar",
        description: "Não há reservas de salas para gerar o relatório."
      });
      return;
    }

    try {
      const exportData = bookings.map(booking => {
        const startDate = new Date(booking.start_time);
        const endDate = new Date(booking.end_time);
        
        return {
          "ID": booking.id,
          "Cliente": booking.user 
            ? `${booking.user.first_name || ""} ${booking.user.last_name || ""}`.trim() 
            : "-",
          "Sala": booking.room?.name || "-",
          "Data": format(startDate, "dd/MM/yyyy"),
          "Horário Início": format(startDate, "HH:mm"),
          "Horário Fim": format(endDate, "HH:mm"),
          "Valor Total": `R$ ${booking.total_price?.toFixed(2) || "0.00"}`,
          "Status": booking.status
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reservas de Salas");
      
      const fileName = `Relatório_Reservas_Salas_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Relatório gerado com sucesso",
        description: `O arquivo ${fileName} foi baixado.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro durante a geração do relatório."
      });
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 pb-10">
      {isSuperAdmin && branches && (
        <div className="mb-4 max-w-xs">
          <Select value={branchId || undefined} onValueChange={setBranchId}>
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

      {/* Título e ação */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white p-6 mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <BookOpen className="h-7 w-7 text-purple-700" /> Reservas de Salas
          </CardTitle>
          <CardDescription className="text-gray-500">Gerencie todas as reservas de salas com sistema de pagamento integrado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold leading-tight">Reservas de Salas</h1>
                <p className="text-muted-foreground mt-1 text-base">Acompanhe e gerencie todas as reservas de salas com controle de pagamentos.</p>
              </div>
            </div>
            <Button variant="outline" onClick={downloadReport} className="h-12 text-base font-semibold">
              <Download className="mr-2 h-5 w-5" />
              Baixar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      <AdminStatsCards stats={stats} isLoading={isLoading} type="bookings" />

      {/* Campo de busca */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <Input
          placeholder="Buscar por cliente ou sala..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <span className="text-sm text-muted-foreground">{filteredBookings.length} reservas</span>
          <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(1)}>&laquo;</Button>
          <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>&lsaquo;</Button>
          <span className="text-sm">Página {page} de {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>&rsaquo;</Button>
          <Button variant="ghost" size="icon" disabled={page === totalPages} onClick={() => setPage(totalPages)}>&raquo;</Button>
        </div>
      </div>

      {/* Tabs e tabela */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as BookingStatus | "all")}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmadas</TabsTrigger>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/10 p-6 text-center">
              <p className="text-destructive font-medium">Erro ao carregar reservas</p>
              <p className="text-sm text-muted-foreground mt-2">
                {(error as Error).message || "Ocorreu um erro ao carregar as reservas."}
              </p>
            </div>
          ) : !bookings || bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/20">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma reserva de sala encontrada</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Quando houver reservas de salas, elas aparecerão aqui para você gerenciar.
              </p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Sala</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="py-3 px-4">
                            <div className="font-medium">
                              {booking.user 
                                ? `${booking.user.first_name || ""} ${booking.user.last_name || ""}`.trim() 
                                : booking.user_id}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            {booking.room?.name || "-"}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm">
                            <div>
                              <div>{format(new Date(booking.start_time), "dd/MM/yyyy")}</div>
                              <div className="text-muted-foreground">
                                {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm font-medium">
                            R$ {booking.total_price?.toFixed(2) || "0.00"}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm">
                            <StatusBadge status={booking.status} />
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm">
                            <div className="flex gap-2 flex-col lg:flex-row">
                              <Button size="sm" variant="outline" onClick={() => { setSelectedBooking(booking); setShowDetails(true); }}>
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                              {booking.orders && booking.orders.length > 0 && (
                                <PaymentStatusManager
                                  orderId={booking.orders[0].id}
                                  status={booking.orders[0].status}
                                  paymentMethod={booking.orders[0].payment_method}
                                  onStatusUpdate={refetch}
                                  order={booking.orders[0]}
                                />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Reserva</DialogTitle>
            <DialogDescription>Informações completas sobre a reserva selecionada</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Informações do Cliente</h3>
                  <p><strong>Nome:</strong> {selectedBooking.user ? `${selectedBooking.user.first_name || ""} ${selectedBooking.user.last_name || ""}`.trim() : selectedBooking.user_id}</p>
                  <p><strong>Data da Reserva:</strong> {format(new Date(selectedBooking.created_at), "dd/MM/yyyy HH:mm")}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Detalhes da Reserva</h3>
                  <StatusBadge status={selectedBooking.status} />
                  <p className="mt-2"><strong>Valor Total:</strong> R$ {selectedBooking.total_price?.toFixed(2) || "0.00"}</p>
                  <p><strong>Sala:</strong> {selectedBooking.room?.name || "-"}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Horário</h3>
                <p><strong>Data:</strong> {format(new Date(selectedBooking.start_time), "dd/MM/yyyy")}</p>
                <p><strong>Início:</strong> {format(new Date(selectedBooking.start_time), "HH:mm")}</p>
                <p><strong>Fim:</strong> {format(new Date(selectedBooking.end_time), "HH:mm")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBookings;
