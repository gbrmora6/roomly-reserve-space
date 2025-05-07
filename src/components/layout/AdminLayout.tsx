
import React, { useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdminSidebarHeader } from "./sidebar/AdminSidebarHeader";
import { AdminSidebarMenu } from "./sidebar/AdminSidebarMenu";
import { AdminSidebarFooter } from "./sidebar/AdminSidebarFooter";
import { useAuth } from "@/contexts/AuthContext";

const AdminLayout: React.FC = () => {
  const { user, refreshUserClaims } = useAuth();
  
  // Verify admin permissions on component mount
  useEffect(() => {
    // Always refresh claims when admin layout is mounted
    refreshUserClaims();
    
    // Log debug information
    console.log("AdminLayout mounted, user permissions:", {
      isAdmin: user?.user_metadata?.is_admin, 
      role: user?.user_metadata?.role,
      email: user?.email
    });
  }, [user, refreshUserClaims]);
  
  // Additional security check - verify admin role
  const isAdmin = 
    user?.user_metadata?.is_admin === true || 
    user?.user_metadata?.role === "admin" ||
    user?.email === "admin@example.com" ||
    user?.email === "cpd@sapiens-psi.com.br";
    
  // If user is not admin, redirect to homepage
  if (!isAdmin) {
    console.error("Access attempt to admin area by non-admin user");
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <Sidebar>
          <AdminSidebarHeader />
          <SidebarContent>
            <AdminSidebarMenu />
          </SidebarContent>
          <AdminSidebarFooter />
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
