import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { useBranchFilter } from "@/hooks/useBranchFilter";

type BookingStatus = "in_process" | "paid" | "partial_refunded" | "pre_authorized" | "recused" | "pending" | "confirmed";

interface EquipmentBooking {
  id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: BookingStatus;
  user_id: string;
  created_at: string;
  user?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  booking_equipment?: Array<{
    id: string;
    quantity: number;
    equipment: {
      name: string;
      price_per_hour: number;
    };
    invoice_url?: string;
  }>;
}

export const useEquipmentBookings = () => {
  const [activeTab, setActiveTab] = useState<BookingStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<EquipmentBooking | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const perPage = 10;

  const { branchId, setBranchId, branches, isSuperAdmin } = useBranchFilter();

  const { data: bookings = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-equipment-bookings", activeTab, branchId],
    queryFn: async () => {
      if (!branchId) {
        return [];
      }

      let query = supabase
        .from("booking_equipment")
        .select(`
          id,
          start_time,
          end_time,
          total_price,
          status,
          user_id,
          created_at,
          booking_equipment(
            id,
            quantity,
            equipment(
              name,
              price_per_hour
            ),
            invoice_url
          )
        `)
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Equipment Bookings Query Error:", error);
        throw error;
      }

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(booking => booking.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds);

        return data.map(booking => ({
          ...booking,
          user: profiles?.find(profile => profile.id === booking.user_id) || null
        })) as EquipmentBooking[];
      }

      return data as EquipmentBooking[] || [];
    },
    enabled: !!branchId,
  });

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

  // Resetar página ao buscar
  useEffect(() => {
    setPage(1);
  }, [search, activeTab, branchId]);

  // Estatísticas
  const stats = useMemo(() => {
    if (!bookings) return {
      total: 0,
      faturado: 0,
      pagas: 0,
      pendentes: 0,
      canceladas: 0,
    };

    let total = bookings.length;
    let faturado = 0;
    let pagas = 0;
    let pendentes = 0;
    let canceladas = 0;

    bookings.forEach(booking => {
      if (booking.status === "paid") {
        pagas++;
        faturado += booking.total_price || 0;
      } else if (booking.status === "in_process" || booking.status === "pre_authorized") {
        pendentes++;
      } else if (booking.status === "recused") {
        canceladas++;
      }
    });

    return {
      total,
      faturado,
      pagas,
      pendentes,
      canceladas,
    };
  }, [bookings]);

  const translateStatus = (status: BookingStatus): string => {
    switch (status) {
      case "in_process": return "Em Processamento";
      case "paid": return "Paga";
      case "partial_refunded": return "Parcialmente Devolvida";
      case "pre_authorized": return "Pré-autorizada";
      case "recused": return "Recusada";
      case "pending": return "Pendente";
      case "confirmed": return "Confirmada";
      default: return status;
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

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reservas de Equipamentos");
      
      const fileName = `Relatório_Reservas_Equipamentos_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
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

  const handleViewDetails = (booking: EquipmentBooking) => {
    setSelectedBooking(booking);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedBooking(null);
  };

  return {
    // State
    activeTab,
    setActiveTab,
    search,
    setSearch,
    page,
    setPage,
    selectedBooking,
    showDetails,
    
    // Branch filter
    branchId,
    setBranchId,
    branches,
    isSuperAdmin,
    
    // Data
    bookings: paginatedBookings,
    filteredBookings,
    isLoading,
    error,
    stats,
    totalPages,
    
    // Functions
    refetch,
    downloadReport,
    translateStatus,
    handleViewDetails,
    handleCloseDetails,
  };
};