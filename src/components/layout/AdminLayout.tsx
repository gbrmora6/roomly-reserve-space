
import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building,
  Bed,
  Mic,
  BookOpen,
  Package,
  Users,
  LogOut,
  Home,
  Circle,
} from "lucide-react";

const AdminLayout: React.FC = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [roomNotificationCount, setRoomNotificationCount] = useState(0);
  const [equipmentNotificationCount, setEquipmentNotificationCount] = useState(0);
  const [notificationSound] = useState<HTMLAudioElement | null>(
    typeof window !== "undefined" ? new Audio("/notification.mp3") : null
  );
  
  // Query to get pending room bookings
  const { data: pendingRoomBookings } = useQuery({
    queryKey: ["pending-room-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id")
        .eq("status", "pending");
        
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Query to get pending equipment bookings
  const { data: pendingEquipmentBookings } = useQuery({
    queryKey: ["pending-equipment-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_equipment")
        .select("id")
        .eq("status", "pending");
        
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Set up real-time listeners for new bookings
  useEffect(() => {
    const roomBookingsChannel = supabase
      .channel('room_bookings_changes')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public',
          table: 'bookings',
          filter: 'status=eq.pending'
        },
        (payload) => {
          console.log('New room booking received!', payload);
          setRoomNotificationCount(prev => prev + 1);
          notificationSound?.play().catch(err => console.error("Error playing notification sound:", err));
        }
      )
      .subscribe();
      
    const equipmentBookingsChannel = supabase
      .channel('equipment_bookings_changes')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public',
          table: 'booking_equipment',
          filter: 'status=eq.pending'
        },
        (payload) => {
          console.log('New equipment booking received!', payload);
          setEquipmentNotificationCount(prev => prev + 1);
          notificationSound?.play().catch(err => console.error("Error playing notification sound:", err));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(roomBookingsChannel);
      supabase.removeChannel(equipmentBookingsChannel);
    };
  }, [notificationSound]);
  
  // Update notification counts when data changes
  useEffect(() => {
    if (pendingRoomBookings) {
      setRoomNotificationCount(pendingRoomBookings.length);
    }
  }, [pendingRoomBookings]);
  
  useEffect(() => {
    if (pendingEquipmentBookings) {
      setEquipmentNotificationCount(pendingEquipmentBookings.length);
    }
  }, [pendingEquipmentBookings]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <Sidebar>
          <SidebarHeader className="flex flex-col items-center justify-center p-4 border-b">
            <h2 className="text-xl font-bold text-primary">EspaçoPsic Admin</h2>
            <p className="text-sm text-muted-foreground">
              {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
            </p>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Principal</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/admin" className={isActive("/admin") ? "bg-muted" : ""}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Painel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/admin/company-profile"
                      className={isActive("/admin/company-profile") ? "bg-muted" : ""}
                    >
                      <Building className="mr-2 h-4 w-4" />
                      <span>Perfil da Empresa</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/admin/rooms"
                      className={isActive("/admin/rooms") ? "bg-muted" : ""}
                    >
                      <Bed className="mr-2 h-4 w-4" />
                      <span>Salas</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/admin/equipment"
                      className={isActive("/admin/equipment") ? "bg-muted" : ""}
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      <span>Equipamentos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/admin/bookings"
                      className={isActive("/admin/bookings") ? "bg-muted" : ""}
                    >
                      <div className="flex items-center">
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>Reservas de Salas</span>
                        {roomNotificationCount > 0 && (
                          <Circle className="ml-2 h-2 w-2 text-red-500 fill-red-500" />
                        )}
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/admin/equipment-bookings"
                      className={isActive("/admin/equipment-bookings") ? "bg-muted" : ""}
                    >
                      <div className="flex items-center">
                        <Package className="mr-2 h-4 w-4" />
                        <span>Reservas de Equipamentos</span>
                        {equipmentNotificationCount > 0 && (
                          <Circle className="ml-2 h-2 w-2 text-red-500 fill-red-500" />
                        )}
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/admin/clients"
                      className={isActive("/admin/clients") ? "bg-muted" : ""}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span>Clientes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="flex flex-col gap-2 p-4 border-t">
            <Button variant="outline" asChild className="w-full">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Site Principal
              </Link>
            </Button>
            <Button variant="destructive" className="w-full" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <h1 className="text-xl font-bold">Painel Administrativo</h1>
              </div>
            </header>

            <div className="flex-1 p-6">
              <Outlet />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
