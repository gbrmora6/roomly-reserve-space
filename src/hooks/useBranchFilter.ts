
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBranchFilter() {
  const { user } = useAuth();
  const [branchId, setBranchId] = useState<string>("");

  // Fetch all branches for super admin
  const { data: branches, isLoading: isBranchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: user?.user_metadata?.role === "super_admin"
  });

  // Check if user is super admin
  const isSuperAdmin = user?.user_metadata?.role === "super_admin";

  useEffect(() => {
    if (user?.user_metadata?.branch_id) {
      setBranchId(user.user_metadata.branch_id);
    } else if (branches && branches.length > 0) {
      // If super admin and no branch selected, select first branch
      setBranchId(branches[0].id);
    }
  }, [user, branches]);

  return {
    branchId,
    setBranchId: isSuperAdmin ? setBranchId : undefined,
    branches,
    isSuperAdmin,
    isLoading: isBranchesLoading
  };
}
