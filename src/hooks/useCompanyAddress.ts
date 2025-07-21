import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranchFilter } from "@/hooks/useBranchFilter";

interface CompanyAddress {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  name: string;
}

export const useCompanyAddress = () => {
  const [companyAddress, setCompanyAddress] = useState<CompanyAddress>({
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    name: ""
  });
  const { branchId } = useBranchFilter();

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      if (!branchId) return;
      const { data, error } = await supabase
        .from("branches")
        .select("street, number, neighborhood, city, name")
        .eq("id", branchId)
        .maybeSingle();
      
      if (data && !error) {
        setCompanyAddress(data);
      }
    };
    
    fetchCompanyProfile();
  }, [branchId]);

  const formatAddress = () => {
    if (!companyAddress.street) return "";
    return `${companyAddress.street}, ${companyAddress.number} - ${companyAddress.neighborhood}, ${companyAddress.city}`;
  };

  return { companyAddress, formatAddress };
};
