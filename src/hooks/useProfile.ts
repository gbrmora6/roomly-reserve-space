
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { profileSchema, type ProfileFormData } from "@/schemas/profileSchema";

export const useProfile = () => {
  const { user } = useAuth();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: async () => {
      if (!user) return {
        first_name: "",
        last_name: "",
        phone: "",
        crp: "",
        specialty: "",
        cpf: "",
        cnpj: "",
        cep: "",
        state: "",
        city: "",
        neighborhood: "",
        street: "",
        house_number: ""
      };
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("Erro ao buscar perfil:", error);
          throw error;
        }
        
        return {
          first_name: data?.first_name || "",
          last_name: data?.last_name || "",
          phone: data?.phone || "",
          crp: data?.crp || "",
          specialty: data?.specialty || "",
          cpf: data?.cpf || "",
          cnpj: data?.cnpj || "",
          cep: data?.cep || "",
          state: data?.state || "",
          city: data?.city || "",
          neighborhood: data?.neighborhood || "",
          street: data?.street || "",
          house_number: data?.house_number || ""
        };
      } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar perfil",
          description: "Não foi possível carregar suas informações. Tente novamente mais tarde.",
        });
        
        return {
          first_name: "",
          last_name: "",
          phone: "",
          crp: "",
          specialty: "",
          cpf: "",
          cnpj: "",
          cep: "",
          state: "",
          city: "",
          neighborhood: "",
          street: "",
          house_number: ""
        };
      }
    }
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Você precisa estar logado para atualizar seu perfil.",
      });
      return;
    }
    
    try {
      console.log("Enviando dados para atualização:", data);
      
      // Handle empty strings for fields that should be null in the database
      const profileData = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        crp: data.crp === "" ? null : data.crp,
        specialty: data.specialty,
        cpf: data.cpf === "" ? null : data.cpf,
        cnpj: data.cnpj === "" ? null : data.cnpj,
        cep: data.cep,
        state: data.state,
        city: data.city,
        neighborhood: data.neighborhood,
        street: data.street,
        house_number: data.house_number
      };
      
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);

      if (error) {
        console.error('Erro detalhado ao atualizar perfil:', error);
        throw error;
      }

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar perfil",
        description: error.message || "Ocorreu um erro ao atualizar suas informações.",
      });
    }
  };

  return {
    form,
    onSubmit
  };
};
