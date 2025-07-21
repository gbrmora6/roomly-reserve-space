
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";


type BookingStatus = Database["public"]["Enums"]["booking_status"];

export const useEquipmentBookings = () => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Get user claims from session metadata
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });
  
  const userClaims = session?.user?.user_metadata;
  const isSuperAdmin = userClaims?.role === 'super_admin';

  // Get branches for super admin
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Set default branch for regular admin
  const effectiveBranchId = branchId || userClaims?.branch_id;

  // Valid booking statuses from the enum
  const validStatuses: BookingStatus[] = ['in_process', 'paid', 'partial_refunded', 'cancelled', 'pre_authorized', 'recused'];

  const getBookingsByStatus = (status: BookingStatus) => {
    return useQuery({
      queryKey: ["equipment-bookings", effectiveBranchId, status],
      queryFn: async () => {
        if (!effectiveBranchId) return [];
        
        const { data, error } = await supabase
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
            equipment(name, price_per_hour),
            invoice_url
          `)
          .eq("branch_id", effectiveBranchId)
          .eq("status", status)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(`Error fetching ${status} equipment bookings:`, error);
          throw error;
        }

        return data || [];
      },
      enabled: !!effectiveBranchId,
    });
  };

  // Get all bookings for filtering
  const { data: allBookings, isLoading, error, refetch } = useQuery({
    queryKey: ["all-equipment-bookings", effectiveBranchId],
    queryFn: async () => {
      if (!effectiveBranchId) return [];
      
      const { data, error } = await supabase
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
          equipment(name, price_per_hour),
          invoice_url
        `)
        .eq("branch_id", effectiveBranchId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching all equipment bookings:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!effectiveBranchId,
  });

  // Filter bookings based on active tab and search
  const filteredBookings = useMemo(() => {
    if (!allBookings) return [];

    let filtered = [...allBookings];

    // Filter by status tab
    if (activeTab !== "all") {
      filtered = filtered.filter(booking => booking.status === activeTab);
    }

    // Filter by search
    if (search) {
      filtered = filtered.filter(booking => 
        booking.equipment?.name?.toLowerCase().includes(search.toLowerCase()) ||
        booking.id.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  }, [allBookings, activeTab, search]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!allBookings) return { total: 0, paid: 0, pending: 0, invoiced: 0 };

    const total = allBookings.reduce((sum, booking) => sum + Number(booking.total_price || 0), 0);
    const paid = allBookings
      .filter(b => b.status === 'paid')
      .reduce((sum, booking) => sum + Number(booking.total_price || 0), 0);
    const pending = allBookings
      .filter(b => b.status === 'in_process')
      .reduce((sum, booking) => sum + Number(booking.total_price || 0), 0);
    const invoiced = allBookings
      .filter(b => b.invoice_url)
      .reduce((sum, booking) => sum + Number(booking.total_price || 0), 0);

    return { total, paid, pending, invoiced };
  }, [allBookings]);

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  // Download report function
  const downloadReport = () => {
    // Implementation for downloading report
    console.log("Download report for equipment bookings");
  };

  // Modal handlers
  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setSelectedBooking(null);
    setShowDetails(false);
  };

  // Using valid enum values for individual status queries
  const inProcessBookings = getBookingsByStatus('in_process');
  const paidBookings = getBookingsByStatus('paid');
  const cancelledBookings = getBookingsByStatus('cancelled');

  return {
    // State
    activeTab,
    setActiveTab,
    search,
    setSearch,
    page,
    setPage,
    branchId,
    setBranchId,
    branches,
    isSuperAdmin,
    
    // Data
    bookings: allBookings || [],
    filteredBookings,
    isLoading,
    error,
    stats,
    totalPages,
    
    // Actions
    refetch,
    downloadReport,
    
    // Modal
    selectedBooking,
    showDetails,
    handleViewDetails,
    handleCloseDetails,
    
    // Individual status queries (for backward compatibility)
    inProcessBookings,
    paidBookings,
    cancelledBookings,
  };
};
