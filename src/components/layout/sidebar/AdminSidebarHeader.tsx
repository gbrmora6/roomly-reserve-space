
import React from "react";
import { SidebarHeader } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, User } from "lucide-react";

export const AdminSidebarHeader: React.FC = () => {
  const { user } = useAuth();

  const getUserDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user?.email?.split('@')[0] || 'Admin';
  };

  return (
    <SidebarHeader className="p-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-gray-800 font-bold text-lg leading-tight truncate">
            Roomly Admin
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <User className="h-3 w-3 text-gray-600" />
            <p className="text-gray-600 text-xs truncate">
              {getUserDisplayName()}
            </p>
          </div>
        </div>
      </div>
    </SidebarHeader>
  );
};
