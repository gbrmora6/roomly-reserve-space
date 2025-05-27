
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook customizado para gerenciar filtros por filial (branch)
 * Controla qual filial está selecionada e gerencia permissões de acesso
 */
export function useBranchFilter() {
  const { user } = useAuth();
  
  // Estado para armazenar ID da filial selecionada
  const [branchId, setBranchId] = useState<string>("");

  // Query para buscar todas as filiais (apenas para super admin)
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
    // Só executa se o usuário for super admin
    enabled: user?.user_metadata?.role === "super_admin"
  });

  // Verifica se o usuário é super administrador
  const isSuperAdmin = user?.user_metadata?.role === "super_admin";

  // Efeito para definir filial inicial baseada nas permissões do usuário
  useEffect(() => {
    if (user?.user_metadata?.branch_id) {
      // Se usuário tem filial específica definida, usa essa filial
      setBranchId(user.user_metadata.branch_id);
    } else if (branches && branches.length > 0) {
      // Se é super admin e não tem filial específica, seleciona primeira filial
      setBranchId(branches[0].id);
    }
  }, [user, branches]);

  return {
    // ID da filial atualmente selecionada
    branchId,
    
    // Função para alterar filial (disponível apenas para super admin)
    setBranchId: isSuperAdmin ? setBranchId : undefined,
    
    // Lista de todas as filiais (para super admin)
    branches,
    
    // Flag indicando se usuário é super admin
    isSuperAdmin,
    
    // Estado de carregamento das filiais
    isLoading: isBranchesLoading
  };
}
