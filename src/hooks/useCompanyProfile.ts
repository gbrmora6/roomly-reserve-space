
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useCompanyProfile = () => {
  const { toast } = useToast();
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [showAddressDialog, setShowAddressDialog] = useState(false);

  const handleShowAddress = async () => {
    const { data, error } = await supabase
      .from("company_profile")
      .select("*")
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
