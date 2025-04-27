
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

export const BookingStatusBadge = ({ status }: BookingStatusBadgeProps) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendente</Badge>;
    case "confirmed":
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Confirmada</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Cancelada</Badge>;
    default:
      return null;
  }
};
