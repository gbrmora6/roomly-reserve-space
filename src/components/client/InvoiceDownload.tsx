
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FileText, File } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InvoiceDownloadProps {
  bookingId?: string;
  equipmentBookingId?: string;
  orderId?: string;
  status: string;
}

export const InvoiceDownload = ({ 
  bookingId, 
  equipmentBookingId, 
  orderId, 
  status 
}: InvoiceDownloadProps) => {
  const { data: invoiceFiles } = useQuery({
    queryKey: ["invoice-files", bookingId, equipmentBookingId, orderId],
    queryFn: async () => {
      let query = supabase.from("invoice_files").select("*");
      
      if (bookingId) {
        query = query.eq("booking_id", bookingId);
      } else if (equipmentBookingId) {
        query = query.eq("equipment_booking_id", equipmentBookingId);
      } else if (orderId) {
        query = query.eq("order_id", orderId);
      } else {
        return null;
      }

      const { data, error } = await query.single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!bookingId || !!equipmentBookingId || !!orderId,
  });

  const isPaid = status === "paid" || status === "confirmed";
  const hasFiles = invoiceFiles && (invoiceFiles.pdf_url || invoiceFiles.xml_url);

  const handleDownload = (url: string, type: "pdf" | "xml") => {
    if (!isPaid) {
      toast({
        variant: "destructive",
        title: "Download não disponível",
        description: "A nota fiscal só estará disponível após o pagamento.",
      });
      return;
    }

    if (!hasFiles) {
      toast({
        variant: "destructive",
        title: "Arquivo não disponível",
        description: "A nota fiscal ainda não foi enviada pelo administrador.",
      });
      return;
    }

    window.open(url, "_blank");
  };

  if (!isPaid) {
    return (
      <div className="flex gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled className="opacity-50">
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Disponível após o pagamento</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled className="opacity-50">
                <File className="h-4 w-4 mr-2" />
                XML
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Disponível após o pagamento</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(invoiceFiles?.pdf_url, "pdf")}
              disabled={!invoiceFiles?.pdf_url}
              className={!invoiceFiles?.pdf_url ? "opacity-50" : ""}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {invoiceFiles?.pdf_url
                ? "Baixar PDF da nota fiscal"
                : "A nota fiscal ainda não está disponível"
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(invoiceFiles?.xml_url, "xml")}
              disabled={!invoiceFiles?.xml_url}
              className={!invoiceFiles?.xml_url ? "opacity-50" : ""}
            >
              <File className="h-4 w-4 mr-2" />
              XML
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {invoiceFiles?.xml_url
                ? "Baixar XML da nota fiscal"
                : "A nota fiscal ainda não está disponível"
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
