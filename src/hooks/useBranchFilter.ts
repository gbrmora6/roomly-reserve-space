import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

export function useBranchFilter() {
  const { user } = useAuth();
  const [branchId, setBranchId] = useState<string>("");

  useEffect(() => {
    setBranchId(user?.user_metadata?.branch_id || "");
  }, [user]);

  return {
    branchId
  };
} 