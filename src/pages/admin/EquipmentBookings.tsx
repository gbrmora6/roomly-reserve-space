import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Download, Eye, Package } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PaymentStatusManager } from "@/components/admin/PaymentStatusManager";
import { InvoiceUpload } from "@/components/admin/InvoiceUpload";
import { RefundButton } from "@/components/admin/RefundButton";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

// Define types to match BookingTable component expectations
interface User {
  first_name: string | null;
  last_name: string | null;
}

interface Equipment {
  name: string;
  price_per_hour: number;
}

interface BookingEquipment {
  id: string;
  quantity: number;
  equipment: Equipment;
  invoice_url: string | null;
  invoice_uploaded_at: string | null;
  invoice_uploaded_by: string | null;
}

interface Booking {
  id: string;
  user_id: string;
  room_id: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  total_price: number;
  invoice_url: string | null;
  invoice_uploaded_at: string | null;
  invoice_uploaded_by: string | null;
  user: User | null;
  room: {
    name: string;
    price_per_hour: number;
  } | null;
  booking_equipment: BookingEquipment[] | null;
}

const AdminEquipmentBookings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BookingStatus | "all">("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;
  
  const { refreshUserClaims } = useAuth();
  const { branchId, setBranchId, branches, isSuperAdmin } = useBranchFilter();
  
  // Execute refresh claims on component mount
  useEffect(() => {
    console.log("AdminEquipmentBookings component mounted, refreshing user claims");
    const refreshClaims = async () => {
      await refreshUserClaims();
    };
    refreshClaims();
  }, [refreshUserClaims]);
  
  const { data: bookings, isLoading, error, refetch } = useQuery({
    queryKey: ["equipment_bookings", activeTab, branchId],
    queryFn: async () => {
      if (!branchId) return [];
      console.log(`Fetching ${activeTab} equipment bookings`);
      try {
        // Query the booking_equipment table with join to equipment
        let query = supabase
          .from("booking_equipment")
          .select(`
            id,
            booking_id,
            equipment_id,
            quantity,
            start_time,
            end_time,
            status,
            created_at,
            updated_at,
            total_price,
            user_id,
            invoice_url,
            invoice_uploaded_at,
            invoice_uploaded_by,
            equipment:equipment(
              name,
              price_per_hour,
              branch_id
            )
          `)
          .order("created_at", { ascending: false });
        if (activeTab !== "all") {
          query = query.eq("status", activeTab);
        }
        // Filtrar por branch_id da tabela equipment
        query = query.eq("equipment.branch_id", branchId);
        const { data: equipmentBookingsData, error: equipmentError } = await query;
        if (equipmentError) throw equipmentError;
        
        console.log("Equipment booking data retrieved:", equipmentBookingsData?.length || 0, "records");
        
        // Fetch user profiles separately
        let transformedBookings: Booking[] = [];
        
        if (equipmentBookingsData && equipmentBookingsData.length > 0) {
          const userIds = [...new Set(equipmentBookingsData.map(item => item.user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", userIds);

          transformedBookings = equipmentBookingsData.map((item: any) => {
            const user = profiles?.find(profile => profile.id === item.user_id) || { first_name: '', last_name: '' };
            
            return {
              id: item.id,
              user_id: item.user_id,
              room_id: null,
              start_time: item.start_time,
              end_time: item.end_time,
              status: item.status as BookingStatus,
              created_at: item.created_at || '',
              updated_at: item.updated_at || '',
              total_price: item.total_price || 0,
              invoice_url: item.invoice_url,
              invoice_uploaded_at: item.invoice_uploaded_at,
              invoice_uploaded_by: item.invoice_uploaded_by,
              user,
              room: null,
              booking_equipment: [{
                id: item.id,
                quantity: item.quantity,
                invoice_url: item.invoice_url,
                invoice_uploaded_at: item.invoice_uploaded_at,
                invoice_uploaded_by: item.invoice_uploaded_by,
                equipment: {
                  name: item.equipment?.name || "Equipamento não encontrado",
                  price_per_hour: item.equipment?.price_per_hour || 0
                }
              }]
            };
          });
        }
        
        console.log("Transformed bookings:", transformedBookings.length);
        return transformedBookings;
      } catch (error) {
        console.error("Error fetching equipment bookings:", error);
        throw error;
      }
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
      if (booking.status === "paid") {
        pagas++;
      } else if (booking.status === "in_process" || booking.status === "pre_authorized") {
        pendentes++;
      } else if (booking.status === "recused" || booking.status === "partial_refunded") {
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
      const equipmentName = booking.booking_equipment?.[0]?.equipment?.name?.toLowerCase() || "";
      return name.includes(s) || equipmentName.includes(s);
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
        .from("booking_equipment")
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
        description: "Não há reservas de equipamentos para gerar o relatório."
      });
      return;
    }

    try {
      // Prepare data for export
      const exportData = bookings.map(booking => {
        const startDate = new Date(booking.start_time);
        const endDate = new Date(booking.end_time);
        
        const equipmentText = booking.booking_equipment && booking.booking_equipment.length > 0
          ? booking.booking_equipment.map(item => 
              `${item.quantity}x ${item.equipment.name}`
            ).join("; ")
          : "Nenhum";
        
        return {
          "ID": booking.id,
          "Cliente": booking.user 
            ? `${booking.user.first_name || ""} ${booking.user.last_name || ""}`.trim() 
            : "-",
          "Data": format(startDate, "dd/MM/yyyy"),
          "Horário Início": format(startDate, "HH:mm"),
          "Horário Fim": format(endDate, "HH:mm"),
          "Equipamentos": equipmentText,
          "Valor Total": `R$ ${booking.total_price?.toFixed(2) || "0.00"}`,
          "Status": translateStatus(booking.status)
        };
      });

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reservas de Equipamentos");
      
      // Generate filename with current date
      const fileName = `Relatório_Reservas_Equipamentos_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
      
      // Write and download
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Relatório gerado com sucesso",
        description: `O arquivo ${fileName} foi baixado.`
      });
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro durante a geração do relatório. Tente novamente."
      });
    }
  };

  const translateStatus = (status: BookingStatus): string => {
    switch (status) {
      case "in_process": return "Em Processamento";
      case "paid": return "Paga";
      case "partial_refunded": return "Parcialmente Devolvida";
      case "pre_authorized": return "Pré-autorizada";
      case "recused": return "Recusada";
      // Status legados removidos - usando apenas novos status
      default: return status;
    }
  };
  
  // Garantir que bookings é um array válido antes de passar para os componentes
  const safeBookings = Array.isArray(bookings) ? bookings.map(booking => ({
    ...booking,
    user: booking.user || { first_name: '', last_name: '' },
    booking_equipment: booking.booking_equipment || []
  })) : [];
  
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
      <Card className="shadow-lg rounded-2xl border-0 bg-white">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl font-bold leading-tight">Reservas de Equipamentos</CardTitle>
                <CardDescription className="text-muted-foreground mt-1 text-base">
                  Acompanhe e gerencie todas as reservas de equipamentos com controle de pagamentos.
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={downloadReport} className="h-12 text-base font-semibold">
              <Download className="mr-2 h-5 w-5" />
              Baixar Relatório
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Cards de resumo */}
      <AdminStatsCards stats={stats} isLoading={isLoading} type="equipment" />

      {/* Campo de busca */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <Input
          placeholder="Buscar por cliente ou equipamento..."
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
            <TabsTrigger value="paid">Pagas</TabsTrigger>
            <TabsTrigger value="in_process">Em Processo</TabsTrigger>
            <TabsTrigger value="recused">Canceladas</TabsTrigger>
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
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma reserva de equipamento encontrada</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Quando houver reservas de equipamentos, elas aparecerão aqui para você gerenciar.
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
                        <TableHead>Equipamento</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Quantidade</TableHead>
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
                            {booking.booking_equipment?.[0]?.equipment?.name || "-"}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm">
                            <div>
                              <div>{format(new Date(booking.start_time), "dd/MM/yyyy")}</div>
                              <div className="text-muted-foreground">
                                {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm">
                            {booking.booking_equipment?.[0]?.quantity || 0}x
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
                              {/* Botões específicos para reservas de equipamentos */}
                              {booking.status === "paid" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase
                                        .from("booking_equipment")
                                        .update({ status: "recused" })
                                        .eq("id", booking.id);
                                      
                                      if (error) throw error;
                                      
                                      toast({
                                        title: "Estorno realizado",
                                        description: "A reserva foi cancelada e o estorno foi processado.",
                                      });
                                      
                                      refetch();
                                    } catch (error: any) {
                                      toast({
                                        title: "Erro ao processar estorno",
                                        description: error.message || "Erro desconhecido",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Estornar
                                </Button>
                              )}
                              {booking.status === "in_process" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase
                                        .from("booking_equipment")
                                        .update({ status: "paid" })
                                        .eq("id", booking.id);
                                      
                                      if (error) throw error;
                                      
                                      toast({
                                        title: "Pagamento confirmado",
                                        description: "O pagamento foi confirmado com sucesso.",
                                      });
                                      
                                      refetch();
                                    } catch (error: any) {
                                      toast({
                                        title: "Erro ao confirmar pagamento",
                                        description: error.message || "Erro desconhecido",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  Confirmar Pagamento
                                </Button>
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
            <DialogTitle>Detalhes da Reserva de Equipamento</DialogTitle>
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
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Horário</h3>
                <p><strong>Data:</strong> {format(new Date(selectedBooking.start_time), "dd/MM/yyyy")}</p>
                <p><strong>Início:</strong> {format(new Date(selectedBooking.start_time), "HH:mm")}</p>
                <p><strong>Fim:</strong> {format(new Date(selectedBooking.end_time), "HH:mm")}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Equipamentos</h3>
                {selectedBooking.booking_equipment && selectedBooking.booking_equipment.length > 0 ? (
                  <div>
                    {selectedBooking.booking_equipment.map((item, index) => (
                      <div key={index} className="border p-3 rounded">
                        <p><strong>Equipamento:</strong> {item.equipment.name}</p>
                        <p><strong>Quantidade:</strong> {item.quantity}x</p>
                        <p><strong>Preço por hora:</strong> R$ {item.equipment.price_per_hour.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum equipamento encontrado</p>
                )}
              </div>
              {selectedBooking.booking_equipment && selectedBooking.booking_equipment.length > 0 && selectedBooking.booking_equipment[0].invoice_url !== undefined && (
                <div>
                  <h3 className="font-semibold mb-2">Nota Fiscal</h3>
                  <InvoiceUpload
                    recordId={selectedBooking.booking_equipment[0].id}
                    recordType="equipment_booking"
                    currentInvoiceUrl={selectedBooking.booking_equipment[0].invoice_url}
                    onSuccess={() => refetch()}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEquipmentBookings;
