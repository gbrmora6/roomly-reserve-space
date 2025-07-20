
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BranchFilterReturn {
  branchId: string;
  setBranchId: (id: string) => void;
  branches: Array<{ id: string; name: string; city: string }>;
  isSuperAdmin: boolean;
}

export function useBranchFilter(): BranchFilterReturn {
  const { user } = useAuth();
  const [branchId, setBranchId] = useState<string>("");
  const [branches, setBranches] = useState<Array<{ id: string; name: string; city: string }>>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          // Buscar perfil do usuário
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("branch_id, role")
            .eq("id", user.id)
            .maybeSingle();

          if (profile && !profileError) {
            setBranchId(profile.branch_id || "");
            
            // Verificar se é super admin
            const isSuper = profile.role === "admin" && (
              user.email === "cpd@sapiens-psi.com.br" || 
              user.email === "admin@example.com"
            );
            setIsSuperAdmin(isSuper);
          }

          // Buscar todas as filiais se for super admin
          if (isSuperAdmin) {
            const { data: branchesData, error: branchesError } = await supabase
              .from("branches")
              .select("id, name, city")
              .order("name");

            if (branchesData && !branchesError) {
              setBranches(branchesData);
            }
          }
        } catch (error) {
          console.error("Erro ao buscar dados da filial:", error);
        }
      } else {
        setBranchId("");
        setBranches([]);
        setIsSuperAdmin(false);
      }
    };

    fetchData();
  }, [user, isSuperAdmin]);

  return {
    branchId,
    setBranchId,
    branches,
    isSuperAdmin
  };
}
