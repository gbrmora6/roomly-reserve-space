import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarHeader } from "@/components/ui/sidebar";
import { UserCircle } from "lucide-react";

export const AdminSidebarHeader: React.FC = () => {
  const { user } = useAuth();

  return (
    <SidebarHeader className="flex flex-col items-center justify-center py-10 border-b border-white/10">
      <div className="mb-4">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
          <UserCircle className="w-12 h-12 text-white/80" />
        </div>
      </div>
      <h2 className="text-lg font-bold text-white">Admin</h2>
    </SidebarHeader>
  );
};
