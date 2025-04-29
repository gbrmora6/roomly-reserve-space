
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompanyAddress {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
}

export const useCompanyAddress = () => {
  const [companyAddress, setCompanyAddress] = useState<CompanyAddress>({
    street: "",
    number: "",
    neighborhood: "",
    city: "",
  });

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      const { data, error } = await supabase
        .from("company_profile")
        .select("street, number, neighborhood, city")
        .single();
      
      if (data && !error) {
        setCompanyAddress(data);
      }
    };
    
    fetchCompanyProfile();
  }, []);

  const formatAddress = () => {
    if (!companyAddress.street) return "";
    return `${companyAddress.street}, ${companyAddress.number} - ${companyAddress.neighborhood}, ${companyAddress.city}`;
  };

  return { companyAddress, formatAddress };
};
