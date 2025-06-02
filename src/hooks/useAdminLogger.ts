
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchFilter } from "./useBranchFilter";

export const useAdminLogger = () => {
  const { user } = useAuth();
  const { branchId } = useBranchFilter();

  const logMutation = useMutation({
    mutationFn: async (logData: {
      action: string;
      details: any;
      admin_email?: string;
    }) => {
      if (!branchId) throw new Error("Branch ID não encontrado");

      const { error } = await supabase
        .from("admin_logs")
        .insert({
          admin_id: user?.id,
          action: logData.action,
          details: logData.details,
          admin_email: logData.admin_email || user?.email,
          branch_id: branchId
        });

      if (error) throw error;
    },
  });

  const logAction = (action: string, details: any, adminEmail?: string) => {
    logMutation.mutate({
      action,
      details,
      admin_email: adminEmail
    });
  };

  return { logAction, isLogging: logMutation.isPending };
};
