
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarHeader } from "@/components/ui/sidebar";

export const AdminSidebarHeader: React.FC = () => {
  const { user } = useAuth();

  return (
    <SidebarHeader className="flex flex-col items-center justify-center p-4 border-b">
      <h2 className="text-xl font-bold text-primary">EspaçoPsic Admin</h2>
      <p className="text-sm text-muted-foreground">
        {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
      </p>
    </SidebarHeader>
  );
};
