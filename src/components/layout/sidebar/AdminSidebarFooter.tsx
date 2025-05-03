
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SidebarFooter } from "@/components/ui/sidebar";
import { Home, LogOut } from "lucide-react";

export const AdminSidebarFooter: React.FC = () => {
  const { signOut } = useAuth();

  return (
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
  );
};
