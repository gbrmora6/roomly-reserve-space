
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
  Archive,
  CreditCard,
  Clock,
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

  const MenuLink = ({ to, icon: Icon, children, className = "" }: {
    to: string;
    icon: React.ElementType;
    children: React.ReactNode;
    className?: string;
  }) => (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link 
          to={to} 
          className={`flex items-center gap-2 sm:gap-3 text-gray-700 text-xs sm:text-sm py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg transition-all duration-200 ${
            isActive(to) 
              ? "bg-blue-50 text-blue-700 font-semibold shadow-sm border-l-2 border-blue-500" 
              : "hover:bg-gray-50 hover:text-gray-900"
          } ${className}`}
        >
          <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="truncate text-xs sm:text-sm">{children}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      {/* Dashboard */}
      <SidebarGroup>
        <SidebarMenu className="px-1 sm:px-2 pt-1 sm:pt-2">
          <MenuLink to="/admin" icon={LayoutDashboard}>
            Dashboard
          </MenuLink>
          <MenuLink to="/admin/today-reservations" icon={Calendar}>
            Reservas de Hoje
          </MenuLink>
        </SidebarMenu>
      </SidebarGroup>

      {/* Gestão */}
      <SidebarGroup>
        <SidebarGroupLabel className="text-gray-600 text-xs font-medium px-2 sm:px-4 py-1 sm:py-2 mt-1 sm:mt-2 uppercase tracking-wide">
          Gestão
        </SidebarGroupLabel>
        <SidebarMenu className="px-1 sm:px-2">
          <MenuLink to="/admin/company-profile" icon={Building}>
            Perfil da Empresa
          </MenuLink>
          <MenuLink to="/admin/rooms" icon={Bed}>
            Salas
          </MenuLink>
          <MenuLink to="/admin/equipment" icon={Mic}>
            Equipamentos
          </MenuLink>
          <MenuLink to="/admin/products" icon={ShoppingBag}>
            Produtos
          </MenuLink>
          <MenuLink to="/admin/coupons" icon={Tag}>
            Cupons
          </MenuLink>
        </SidebarMenu>
      </SidebarGroup>

      {/* Reservas e Vendas */}
      <SidebarGroup>
        <SidebarGroupLabel className="text-gray-600 text-xs font-medium px-2 sm:px-4 py-1 sm:py-2 mt-1 sm:mt-2 uppercase tracking-wide">
          Reservas & Vendas
        </SidebarGroupLabel>
        <SidebarMenu className="px-1 sm:px-2">
          <MenuLink to="/admin/bookings" icon={BookOpen}>
            Reservas de Salas
          </MenuLink>
          <MenuLink to="/admin/equipment-bookings" icon={Package}>
            Reservas de Equipamentos
          </MenuLink>
          <MenuLink to="/admin/product-sales" icon={ShoppingBag}>
            Vendas de Produtos
          </MenuLink>

        </SidebarMenu>
      </SidebarGroup>

      {/* Usuários */}
      <SidebarGroup>
        <SidebarGroupLabel className="text-gray-600 text-xs font-medium px-2 sm:px-4 py-1 sm:py-2 mt-1 sm:mt-2 uppercase tracking-wide">
          Usuários
        </SidebarGroupLabel>
        <SidebarMenu className="px-1 sm:px-2">
          <MenuLink to="/admin/clients" icon={Users}>
            Clientes
          </MenuLink>
          <MenuLink to="/admin/users" icon={UserPlus}>
            Usuários Admin
          </MenuLink>
        </SidebarMenu>
      </SidebarGroup>

      {/* Relatórios */}
      <SidebarGroup>
        <SidebarGroupLabel className="text-gray-600 text-xs font-medium px-2 sm:px-4 py-1 sm:py-2 mt-1 sm:mt-2 uppercase tracking-wide">
          Relatórios
        </SidebarGroupLabel>
        <SidebarMenu className="px-1 sm:px-2">
          <MenuLink to="/admin/financial-reports" icon={TrendingUp}>
            Relatórios Financeiros
          </MenuLink>
          <MenuLink to="/admin/inventory" icon={Archive}>
            Inventário
          </MenuLink>
        </SidebarMenu>
      </SidebarGroup>

      {/* Sistema */}
      <SidebarGroup>
        <SidebarGroupLabel className="text-gray-600 text-xs font-medium px-2 sm:px-4 py-1 sm:py-2 mt-1 sm:mt-2 uppercase tracking-wide">
          Sistema
        </SidebarGroupLabel>
        <SidebarMenu className="px-1 sm:px-2 pb-2 sm:pb-4">

          <MenuLink to="/admin/payment-settings" icon={CreditCard}>
            Configurações de Pagamento
          </MenuLink>
          <MenuLink to="/admin/expiration-settings" icon={Clock}>
            Configurações de Expiração
          </MenuLink>
          <MenuLink to="/admin/logs" icon={FileText}>
            Logs de Admin
          </MenuLink>
          {isSuperAdmin && (
            <MenuLink to="/admin/branches" icon={Building}>
              Filiais
            </MenuLink>
          )}
        </SidebarMenu>
      </SidebarGroup>
    </div>
  );
};
