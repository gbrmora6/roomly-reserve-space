
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useBranchFilter() {
  const { user } = useAuth();
  const [branchId, setBranchId] = useState<string>("");

  useEffect(() => {
    const fetchBranchId = async () => {
      if (user) {
        try {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("branch_id")
            .eq("id", user.id)
            .single();

          if (profile && !error) {
            setBranchId(profile.branch_id || "");
          }
        } catch (error) {
          console.error("Erro ao buscar branch_id:", error);
        }
      } else {
        setBranchId("");
      }
    };

    fetchBranchId();
  }, [user]);

  return {
    branchId
  };
}
