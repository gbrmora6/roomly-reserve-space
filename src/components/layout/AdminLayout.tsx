
import React from "react";
import { Outlet } from "react-router-dom";
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

const AdminLayout: React.FC = () => {
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
