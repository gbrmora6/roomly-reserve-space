
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface InvoiceUploadProps {
  recordId: string;
  recordType: "order" | "booking" | "equipment_booking";
  currentInvoiceUrl?: string | null;
  onSuccess?: () => void;
}

export const InvoiceUpload = ({ 
  recordId,
  recordType,
  currentInvoiceUrl,
  onSuccess 
}: InvoiceUploadProps) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const uploadInvoice = async () => {
    if (!pdfFile || !user) return;

    setUploading(true);
    try {
      // Upload file to Supabase Storage
      const fileName = `invoice_${recordType}_${recordId}_${Date.now()}.pdf`;
      const filePath = `invoices/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, pdfFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(filePath);

      // Update the record with invoice information
      const tableName = recordType === 'equipment_booking' ? 'booking_equipment' : 
                       recordType === 'booking' ? 'bookings' : 'orders';
      
      const { error: updateError, data: recordData } = await supabase
        .from(tableName)
        .update({
          invoice_url: publicUrl,
          invoice_uploaded_at: new Date().toISOString(),
          invoice_uploaded_by: user.id
        })
        .eq('id', recordId)
        .select('user_id')
        .single();

      if (updateError) {
        throw updateError;
      }

      // Buscar dados do cliente para envio do email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', recordData.user_id)
        .single();

      if (userError) {
        console.warn('Erro ao buscar dados do usuário para email:', userError);
      } else {
        // Enviar email com a nota fiscal
        try {
          const { error: emailError } = await supabase.functions.invoke('send-invoice-email', {
            body: {
              customerEmail: userData.email,
              customerName: `${userData.first_name} ${userData.last_name}`,
              orderId: recordId,
              invoiceUrl: publicUrl,
              orderType: recordType === 'equipment_booking' ? 'Reserva de Equipamento' : 
                        recordType === 'booking' ? 'Reserva de Sala' : 'Pedido'
            }
          });

          if (emailError) {
            console.error('Erro ao enviar email:', emailError);
            toast({
              variant: "destructive",
              title: "Email não enviado",
              description: "Nota fiscal salva, mas houve erro no envio do email.",
            });
          } else {
            toast({
              title: "Nota fiscal enviada",
              description: "A nota fiscal foi salva e enviada por email para o cliente.",
            });
          }
        } catch (emailErr) {
          console.error('Erro na função de email:', emailErr);
          toast({
            variant: "destructive",
            title: "Email não enviado",
            description: "Nota fiscal salva, mas houve erro no envio do email.",
          });
        }
      }
      
      setPdfFile(null);
      queryClient.invalidateQueries({ queryKey: [recordType + 's'] });
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao enviar nota fiscal:', error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar nota fiscal",
        description: "Ocorreu um erro ao enviar a nota fiscal. Tente novamente.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          variant: "destructive",
          title: "Arquivo inválido",
          description: "Por favor, selecione apenas arquivos PDF.",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
        });
        return;
      }
      setPdfFile(file);
    }
  };

  const removePdfFile = () => {
    setPdfFile(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Nota Fiscal (PDF)
        </Label>
        {currentInvoiceUrl && (
          <a
            href={currentInvoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            <span>Ver atual</span>
          </a>
        )}
      </div>
      
      {!pdfFile ? (
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept=".pdf"
            onChange={handlePdfChange}
            className="flex-1"
          />
          <Upload className="h-4 w-4 text-gray-400" />
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-600" />
            <span className="text-sm text-gray-700">{pdfFile.name}</span>
            <span className="text-xs text-gray-500">
              ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={uploadInvoice}
              disabled={uploading}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {uploading ? 'Enviando...' : 'Enviar'}
            </Button>
            <Button
              onClick={removePdfFile}
              variant="outline"
              size="sm"
              className="p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
