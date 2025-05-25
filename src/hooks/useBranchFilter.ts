import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useBranchFilter() {
  const { user } = useAuth();
  const [branchId, setBranchId] = useState<string>("");

  useEffect(() => {
    setBranchId(user?.user_metadata?.branch_id || "");
  }, [user]);

  return {
    branchId,
    setBranchId,
    branches: undefined,
    isSuperAdmin: false
  };
} 