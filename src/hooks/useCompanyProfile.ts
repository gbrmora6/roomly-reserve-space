import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBranchFilter } from "@/hooks/useBranchFilter";

export const useCompanyProfile = () => {
  const { toast } = useToast();
  const { branchId } = useBranchFilter();
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [showAddressDialog, setShowAddressDialog] = useState(false);

  const handleShowAddress = async () => {
    if (!branchId) return;
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .eq("id", branchId)
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar o endereço.",
        variant: "destructive",
      });
    } else {
      setCompanyProfile(data);
      setShowAddressDialog(true);
    }
  };

  return {
    companyProfile,
    showAddressDialog,
    setShowAddressDialog,
    handleShowAddress
  };
};
