
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building,
  Bed,
  Mic,
  BookOpen,
  Package,
  Users,
} from "lucide-react";
import { NotificationIndicator, useNotifications } from "./AdminSidebarNotifications";

export const AdminSidebarMenu: React.FC = () => {
  const location = useLocation();
  const { roomNotificationCount, equipmentNotificationCount } = useNotifications();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
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
                <NotificationIndicator count={roomNotificationCount} />
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
                <NotificationIndicator count={equipmentNotificationCount} />
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
  );
};
