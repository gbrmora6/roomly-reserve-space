
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client-bypass";
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
  quantity: number;
  equipment_id: string;
  invoice_url?: string;
  user?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  equipment?: {
    name: string;
    price_per_hour: number;
  } | null;
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

      console.log("Fetching equipment bookings for branch:", branchId, "status:", activeTab);

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
          quantity,
          equipment_id,
          invoice_url
        `)
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }

      const { data: equipmentBookings, error: bookingError } = await query;

      if (bookingError) {
        console.error("Equipment Bookings Query Error:", bookingError);
        throw bookingError;
      }

      console.log("Raw equipment bookings data:", equipmentBookings);

      if (!equipmentBookings || equipmentBookings.length === 0) {
        return [];
      }

      // Fetch user profiles
      const userIds = [...new Set(equipmentBookings.map(booking => booking.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);

      console.log("User profiles:", profiles);

      // Fetch equipment data
      const equipmentIds = [...new Set(equipmentBookings.map(booking => booking.equipment_id))];
      const { data: equipmentData } = await supabase
        .from("equipment")
        .select("id, name, price_per_hour")
        .in("id", equipmentIds);

      console.log("Equipment data:", equipmentData);

      // Combine data
      const result = equipmentBookings.map(booking => ({
        ...booking,
        user: profiles?.find(profile => profile.id === booking.user_id) || null,
        equipment: equipmentData?.find(equipment => equipment.id === booking.equipment_id) || null
      })) as EquipmentBooking[];

      console.log("Final combined bookings:", result);

      return result;
    },
    enabled: !!branchId,
  });

  // Filter bookings based on search
  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (!search.trim()) return bookings;
    
    const searchTerm = search.trim().toLowerCase();
    return bookings.filter(booking => {
      const user = booking.user;
      const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase() : "";
      const equipmentName = booking.equipment?.name?.toLowerCase() || "";
      return userName.includes(searchTerm) || equipmentName.includes(searchTerm);
    });
  }, [bookings, search]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / perPage) || 1;
  const paginatedBookings = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredBookings.slice(start, start + perPage);
  }, [filteredBookings, page]);

  // Reset page when search/tab/branch changes
  useEffect(() => {
    setPage(1);
  }, [search, activeTab, branchId]);

  // Statistics
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
        
        return {
          "ID": booking.id,
          "Cliente": booking.user 
            ? `${booking.user.first_name || ""} ${booking.user.last_name || ""}`.trim() 
            : "-",
          "Equipamento": booking.equipment?.name || "-",
          "Data": format(startDate, "dd/MM/yyyy"),
          "Horário Início": format(startDate, "HH:mm"),
          "Horário Fim": format(endDate, "HH:mm"),
          "Quantidade": booking.quantity,
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
