
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Info, X } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { ClientDetailsModal } from "./ClientDetailsModal";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingActionsProps {
  bookingId: string;
  userId?: string;
  status: BookingStatus;
  onUpdateStatus: (id: string, status: BookingStatus) => void;
}

export const BookingActions = ({
  bookingId,
  userId,
  status,
  onUpdateStatus,
}: BookingActionsProps) => {
  const [clientDetailsOpen, setClientDetailsOpen] = useState(false);

  const handleCloseDetails = () => {
    setClientDetailsOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status === "pending" && (
            <DropdownMenuItem
              onClick={() => onUpdateStatus(bookingId, "confirmed")}
            >
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Confirmar</span>
            </DropdownMenuItem>
          )}
          {status !== "cancelled" && (
            <DropdownMenuItem onClick={() => onUpdateStatus(bookingId, "cancelled")}>
              <X className="mr-2 h-4 w-4 text-red-500" />
              <span>Cancelar</span>
            </DropdownMenuItem>
          )}
          {userId && (
            <DropdownMenuItem onClick={() => setClientDetailsOpen(true)}>
              <Info className="mr-2 h-4 w-4 text-blue-500" />
              <span>Detalhes do Cliente</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {userId && clientDetailsOpen && (
        <ClientDetailsModal 
          isOpen={clientDetailsOpen}
          onClose={handleCloseDetails}
          userId={userId}
        />
      )}
    </>
  );
};
