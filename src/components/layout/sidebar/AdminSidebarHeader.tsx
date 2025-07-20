
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
    <SidebarHeader className="p-2 sm:p-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-gray-800 font-bold text-sm sm:text-lg leading-tight truncate">
            Roomly Admin
          </h2>
          <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5">
            <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-600" />
            <p className="text-gray-600 text-xs truncate">
              {getUserDisplayName()}
            </p>
          </div>
        </div>
      </div>
    </SidebarHeader>
  );
};
