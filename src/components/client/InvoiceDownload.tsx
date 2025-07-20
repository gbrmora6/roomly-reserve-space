
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FileText } from "lucide-react";
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
  const { data: invoiceData } = useQuery({
    queryKey: ["invoice-data", bookingId, equipmentBookingId, orderId],
    queryFn: async () => {
      if (bookingId) {
        const { data, error } = await supabase
          .from("bookings")
          .select("invoice_url")
          .eq("id", bookingId)
          .single();
        if (error && error.code !== "PGRST116") throw error;
        return data;
      } else if (equipmentBookingId) {
        const { data, error } = await supabase
          .from("booking_equipment")
          .select("invoice_url")
          .eq("id", equipmentBookingId)
          .single();
        if (error && error.code !== "PGRST116") throw error;
        return data;
      } else if (orderId) {
        const { data, error } = await supabase
          .from("orders")
          .select("invoice_url")
          .eq("id", orderId)
          .single();
        if (error && error.code !== "PGRST116") throw error;
        return data;
      }
      return null;
    },
    enabled: !!bookingId || !!equipmentBookingId || !!orderId,
  });

  const isPaid = status === "paid";
  const hasInvoice = invoiceData && invoiceData.invoice_url;

  const handleDownload = () => {
    if (!isPaid) {
      toast({
        variant: "destructive",
        title: "Download não disponível",
        description: "A nota fiscal só estará disponível após o pagamento.",
      });
      return;
    }

    if (!hasInvoice) {
      toast({
        variant: "destructive",
        title: "Arquivo não disponível",
        description: "A nota fiscal ainda não foi enviada pelo administrador.",
      });
      return;
    }

    window.open(invoiceData.invoice_url, "_blank");
  };

  if (!isPaid) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" disabled className="opacity-50">
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Nota fiscal disponível após o pagamento</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!hasInvoice}
            className={`${!hasInvoice ? "opacity-50" : "text-green-600 hover:text-green-700"}`}
          >
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {hasInvoice
              ? "Baixar nota fiscal"
              : "A nota fiscal ainda não está disponível"
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
