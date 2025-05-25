import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useBranchFilter() {
  const { user } = useAuth();
  const isSuperAdmin = user?.user_metadata?.is_super_admin === true ||
    user?.email === "admin@example.com" ||
    user?.email === "cpd@sapiens-psi.com.br";
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchId, setBranchId] = useState<string>("");

  useEffect(() => {
    if (isSuperAdmin) {
      supabase.from("branches").select("id, name").then(({ data }) => {
        setBranches(data || []);
        if (!branchId && data && data.length > 0) {
          setBranchId(data[0].id);
        }
      });
    } else {
      setBranchId(user?.user_metadata?.branch_id || "");
    }
    // eslint-disable-next-line
  }, [isSuperAdmin, user]);

  return {
    branchId,
    setBranchId: isSuperAdmin ? (setBranchId as (id: string) => void) : undefined,
    branches: isSuperAdmin ? branches : undefined,
    isSuperAdmin
  };
} 