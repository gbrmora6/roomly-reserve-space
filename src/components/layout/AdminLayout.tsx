
import React from "react";
import { Outlet } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

const AdminLayout: React.FC = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();

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
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span>Reservas de Salas</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/admin/equipment-bookings"
                      className={isActive("/admin/equipment-bookings") ? "bg-muted" : ""}
                    >
                      <Package className="mr-2 h-4 w-4" />
                      <span>Reservas de Equipamentos</span>
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
