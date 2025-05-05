
import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, ExternalLink, X } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingActionsProps {
  bookingId: string;
  userId?: string;
  status: BookingStatus;
  onUpdateStatus: (id: string, status: BookingStatus) => void;
}

export const BookingActions = ({
  bookingId,
  status,
  onUpdateStatus,
}: BookingActionsProps) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/booking/${bookingId}`);
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
          <DropdownMenuItem onClick={handleViewDetails}>
            <ExternalLink className="mr-2 h-4 w-4 text-blue-500" />
            <span>Ver Detalhes</span>
          </DropdownMenuItem>
          
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
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
