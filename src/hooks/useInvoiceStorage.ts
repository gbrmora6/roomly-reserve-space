
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useInvoiceStorage = () => {
  const [isUploading, setIsUploading] = useState(false);

  const initializeBucket = async () => {
    try {
      // Verificar se o bucket existe
      const { data: buckets } = await supabase.storage.listBuckets();
      const invoiceBucket = buckets?.find(bucket => bucket.name === "invoices");
      
      if (!invoiceBucket) {
        // Criar bucket se não existir
        const { error } = await supabase.storage.createBucket("invoices", {
          public: false,
        });
        
        if (error) throw error;
        
        toast({
          title: "Bucket criado",
          description: "Storage para notas fiscais foi configurado.",
        });
      }
    } catch (error: any) {
      console.error("Erro ao inicializar bucket:", error);
      toast({
        variant: "destructive",
        title: "Erro no storage",
        description: "Não foi possível configurar o armazenamento de arquivos.",
      });
    }
  };

  const uploadFile = async (file: File, type: "pdf" | "xml") => {
    setIsUploading(true);
    try {
      const fileName = `${type}-${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("invoices")
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from("invoices")
        .getPublicUrl(data.path);

      return publicUrl.publicUrl;
    } catch (error: any) {
      throw new Error(`Erro ao fazer upload do ${type.toUpperCase()}: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    initializeBucket,
    uploadFile,
    isUploading,
  };
};
