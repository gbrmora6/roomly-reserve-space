
import { Button } from "@/components/ui/button";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingActionsProps {
  bookingId: string;  // novo
  status: BookingStatus;
  onUpdateStatus: (id: string, status: BookingStatus) => void; // corrige a assinatura
}

export const BookingActions = ({ bookingId, status, onUpdateStatus }: BookingActionsProps) => {
  if (status === "pending") {
    return (
      <div className="space-x-2">
        <Button size="sm" onClick={() => onUpdateStatus(bookingId, "confirmed")}>
          Confirmar
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => onUpdateStatus(bookingId, "cancelled")}
        >
          Recusar
        </Button>
      </div>
    );
  }

  if (status === "confirmed") {
    return (
      <Button 
        size="sm" 
        variant="destructive" 
        onClick={() => onUpdateStatus(bookingId, "cancelled")}
      >
        Cancelar
      </Button>
    );
  }

  return null;
};
