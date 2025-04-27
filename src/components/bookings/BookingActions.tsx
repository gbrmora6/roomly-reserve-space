
import { Button } from "@/components/ui/button";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingActionsProps {
  status: BookingStatus;
  onUpdateStatus: (status: BookingStatus) => void;
}

export const BookingActions = ({ status, onUpdateStatus }: BookingActionsProps) => {
  if (status === "pending") {
    return (
      <div className="space-x-2">
        <Button size="sm" onClick={() => onUpdateStatus("confirmed")}>
          Confirmar
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => onUpdateStatus("cancelled")}
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
        onClick={() => onUpdateStatus("cancelled")}
      >
        Cancelar
      </Button>
    );
  }

  return null;
};
