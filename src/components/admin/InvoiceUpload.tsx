
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, File } from "lucide-react";
import { useAdminLogger } from "@/hooks/useAdminLogger";
import { useBranchFilter } from "@/hooks/useBranchFilter";

interface InvoiceUploadProps {
  bookingId?: string;
  equipmentBookingId?: string;
  orderId?: string;
  type: "booking" | "equipment" | "order";
  onSuccess?: () => void;
}

export const InvoiceUpload = ({ 
  bookingId, 
  equipmentBookingId, 
  orderId, 
  type,
  onSuccess 
}: InvoiceUploadProps) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const { logAction } = useAdminLogger();
  const { branchId } = useBranchFilter();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error("Branch ID não encontrado");
      
      let pdfUrl = null;
      let xmlUrl = null;

      // Upload PDF se existir
      if (pdfFile) {
        const pdfFileName = `invoice-pdf-${Date.now()}-${pdfFile.name}`;
        const { data: pdfData, error: pdfError } = await supabase.storage
          .from("invoices")
          .upload(pdfFileName, pdfFile);
        
        if (pdfError) throw pdfError;
        
        const { data: pdfPublicUrl } = supabase.storage
          .from("invoices")
          .getPublicUrl(pdfData.path);
        
        pdfUrl = pdfPublicUrl.publicUrl;
      }

      // Upload XML se existir
      if (xmlFile) {
        const xmlFileName = `invoice-xml-${Date.now()}-${xmlFile.name}`;
        const { data: xmlData, error: xmlError } = await supabase.storage
          .from("invoices")
          .upload(xmlFileName, xmlFile);
        
        if (xmlError) throw xmlError;
        
        const { data: xmlPublicUrl } = supabase.storage
          .from("invoices")
          .getPublicUrl(xmlData.path);
        
        xmlUrl = xmlPublicUrl.publicUrl;
      }

      // Salvar no banco de dados
      const { error: dbError } = await supabase
        .from("invoice_files")
        .insert({
          booking_id: bookingId || null,
          equipment_booking_id: equipmentBookingId || null,
          order_id: orderId || null,
          pdf_url: pdfUrl,
          xml_url: xmlUrl,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id || "",
          branch_id: branchId,
        });

      if (dbError) throw dbError;

      return { pdfUrl, xmlUrl };
    },
    onSuccess: () => {
      toast({
        title: "Nota fiscal carregada",
        description: "Os arquivos foram carregados com sucesso.",
      });

      // Log da ação
      logAction("upload_invoice", {
        type,
        bookingId,
        equipmentBookingId,
        orderId,
        files: {
          pdf: !!pdfFile,
          xml: !!xmlFile
        }
      });

      setPdfFile(null);
      setXmlFile(null);
      queryClient.invalidateQueries({ queryKey: ["invoice-files"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao carregar arquivos",
        description: error.message || "Ocorreu um erro ao carregar os arquivos.",
      });
    },
  });

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    } else {
      toast({
        variant: "destructive",
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo PDF válido.",
      });
    }
  };

  const handleXmlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "text/xml" || file.name.endsWith(".xml"))) {
      setXmlFile(file);
    } else {
      toast({
        variant: "destructive",
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo XML válido.",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile && !xmlFile) {
      toast({
        variant: "destructive",
        title: "Nenhum arquivo selecionado",
        description: "Selecione pelo menos um arquivo (PDF ou XML).",
      });
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload de Nota Fiscal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pdf-file" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Arquivo PDF
            </Label>
            <Input
              id="pdf-file"
              type="file"
              accept=".pdf"
              onChange={handlePdfChange}
            />
            {pdfFile && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {pdfFile.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="xml-file" className="flex items-center gap-2">
              <File className="h-4 w-4" />
              Arquivo XML
            </Label>
            <Input
              id="xml-file"
              type="file"
              accept=".xml"
              onChange={handleXmlChange}
            />
            {xmlFile && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {xmlFile.name}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={uploadMutation.isPending || (!pdfFile && !xmlFile)}
            className="w-full"
          >
            {uploadMutation.isPending ? "Carregando..." : "Fazer Upload"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
