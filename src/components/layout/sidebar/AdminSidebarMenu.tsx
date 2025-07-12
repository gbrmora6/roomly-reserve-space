
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
  ShoppingBag,
  FileText,
  Calendar,
  UserPlus,
  Tag,
  TrendingUp,
  Bell,
  Archive,
  CalendarDays,
} from "lucide-react";
import { NotificationIndicator, useNotifications } from "./AdminSidebarNotifications";
import { useAuth } from "@/contexts/AuthContext";

export const AdminSidebarMenu: React.FC = () => {
  const location = useLocation();
  const { roomNotificationCount, equipmentNotificationCount } = useNotifications();
  const { user } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const isSuperAdmin = user?.user_metadata?.is_super_admin === true ||
    user?.email === "admin@example.com" ||
    user?.email === "cpd@sapiens-psi.com.br";

  return (
    <SidebarGroup>
      <SidebarMenu className="bg-gradient-to-b from-[#232c43] to-[#1a2233] flex-1 px-4 rounded-r-3xl shadow-2xl flex flex-col gap-2 min-w-[260px] h-full justify-start py-4 overflow-y-auto max-h-[calc(100vh-120px)]">
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/today-reservations" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/today-reservations") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <Calendar className="h-4 w-4" />
              <span>Reservas de Hoje</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/company-profile" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/company-profile") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <Building className="h-4 w-4" />
              <span>Perfil da empresa</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/rooms" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/rooms") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <Bed className="h-4 w-4" />
              <span>Salas</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/equipment" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/equipment") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <Mic className="h-4 w-4" />
              <span>Equipamentos</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/products" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/products") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <ShoppingBag className="h-4 w-4" />
              <span>Produtos</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/coupons" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/coupons") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <Tag className="h-4 w-4" />
              <span>Cupons</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/bookings" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/bookings") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <BookOpen className="h-4 w-4" />
              <span>Reserva de salas</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/equipment-bookings" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/equipment-bookings") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <Package className="h-4 w-4" />
              <span>Reserva de equipamentos</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/product-sales" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/product-sales") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <ShoppingBag className="h-4 w-4" />
              <span>Vendas de produtos</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/clients" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/clients") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <Users className="h-4 w-4" />
              <span>Clientes</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/users" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/users") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <UserPlus className="h-4 w-4" />
              <span>Criar Usuários Admin</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/logs" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/logs") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <FileText className="h-4 w-4" />
              <span>Logs de Admin</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {isSuperAdmin && (
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/admin/branches" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/branches") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
                <Building className="h-4 w-4" />
                <span>Filiais</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/financial-reports" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/financial-reports") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <TrendingUp className="h-4 w-4" />
              <span>Relatórios Financeiros</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/notifications" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/notifications") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <Bell className="h-4 w-4" />
              <span>Notificações</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/inventory" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/inventory") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <Archive className="h-4 w-4" />
              <span>Inventário</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/admin/calendar" className={`flex items-center gap-3 text-white text-sm py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive("/admin/calendar") ? "bg-white/10 font-bold shadow" : "hover:bg-white/10 hover:text-white"}`}>
              <CalendarDays className="h-4 w-4" />
              <span>Calendário</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
};
