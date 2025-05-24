
import React, { useEffect, useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import { secureSessionStore, getSecureSessionItem } from "@/utils/encryption";
import { devLog, errorLog } from "@/utils/logger";

const ADMIN_ACCESS_KEY = "admin_access_validated";

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, refreshUserClaims } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Verify admin permissions on component mount
  useEffect(() => {
    const verifyAdmin = async () => {
      setIsVerifying(true);
      
      try {
        // Check if we recently verified admin access to avoid excessive checks
        const sessionValidated = getSecureSessionItem(ADMIN_ACCESS_KEY);
        const cachedEmail = getSecureSessionItem("admin_email");
        
        if (sessionValidated === "true" && cachedEmail === user?.email) {
          devLog("Admin access previously validated this session");
          setIsAuthorized(true);
          setIsVerifying(false);
          return;
        }
        
        // Always refresh claims when admin layout is mounted
        await refreshUserClaims();
        
        // Log debug information
        devLog("AdminLayout mounted, user permissions", {
          isAdmin: user?.user_metadata?.is_admin, 
          role: user?.user_metadata?.role,
          email: user?.email
        });
        
        // Verify admin role with multiple checks
        const isAdmin = 
          user?.user_metadata?.is_admin === true || 
          user?.user_metadata?.role === "admin" ||
          user?.email === "admin@example.com" ||
          user?.email === "cpd@sapiens-psi.com.br";
        
        if (!isAdmin) {
          errorLog("Access attempt to admin area by non-admin user");
          toast({
            variant: "destructive",
            title: "Acesso não autorizado",
            description: "Você não tem permissão para acessar o painel administrativo.",
          });
          setIsAuthorized(false);
        } else {
          // Cache the successful verification in the session
          secureSessionStore(ADMIN_ACCESS_KEY, "true");
          secureSessionStore("admin_email", user?.email || "");
          setIsAuthorized(true);
        }
      } catch (error) {
        errorLog("Error verifying admin access", error);
        setIsAuthorized(false);
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyAdmin();
    
    // Set up periodic verification of admin status
    const intervalId = setInterval(() => {
      refreshUserClaims();
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(intervalId);
  }, [user?.email, refreshUserClaims]);
  
  // Show loading state
  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-roomly-600 mb-6" />
        <p className="text-roomly-600 font-medium">Verificando permissões administrativas...</p>
      </div>
    );
  }
  
  // If user is not admin, redirect to homepage
  if (!isAuthorized) {
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
              {children || <Outlet />}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
