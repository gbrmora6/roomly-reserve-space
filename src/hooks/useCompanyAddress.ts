import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBranchFilter } from '@/hooks/useBranchFilter';

interface CompanyAddress {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  name?: string;
}

export const useCompanyAddress = () => {
  const [companyAddress, setCompanyAddress] = useState<CompanyAddress>({});
  const { branchId } = useBranchFilter();

  useEffect(() => {
    const fetchCompanyAddress = async () => {
      if (!branchId) return;
      
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('name, street, number, neighborhood, city, state')
          .eq('id', branchId)
          .single();
        
        if (data && !error) {
          setCompanyAddress(data);
        } else {
          console.error('Erro ao buscar endereço da empresa:', error);
        }
      } catch (err) {
        console.error('Erro ao buscar endereço da empresa:', err);
      }
    };
    
    fetchCompanyAddress();
  }, [branchId]);

  const formatAddress = () => {
    if (!companyAddress.street) return '';
    
    const addressParts = [
      companyAddress.street,
      companyAddress.number,
      companyAddress.neighborhood,
      companyAddress.city,
      companyAddress.state
    ].filter(Boolean);
    
    return addressParts.join(', ');
  };

  const formatFullAddress = () => {
    if (!companyAddress.name) return formatAddress();
    
    const address = formatAddress();
    return address ? `${companyAddress.name} - ${address}` : companyAddress.name;
  };

  return {
    companyAddress,
    formatAddress,
    formatFullAddress,
    isLoading: !branchId,
  };
};