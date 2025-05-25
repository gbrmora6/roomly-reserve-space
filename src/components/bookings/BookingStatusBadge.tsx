import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

const statusMap: Record<string, { label: string; color: string }> = {
  'pago': { label: 'Pago', color: 'bg-green-100 text-green-800' },
  'falta pagar': { label: 'Falta pagar', color: 'bg-yellow-100 text-yellow-800' },
  'cancelado por falta de pagamento': { label: 'Cancelado por falta de pagamento', color: 'bg-red-100 text-red-800' },
};

export const BookingStatusBadge = ({ status }: BookingStatusBadgeProps) => {
  const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

  return <Badge variant="outline" className={`${statusInfo.color} border-gray-300`}>{statusInfo.label}</Badge>;
};
