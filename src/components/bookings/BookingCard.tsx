import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Package, RefreshCw, Download, X, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/utils/formatCurrency";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { InvoiceDownload } from "@/components/client/InvoiceDownload";



interface BookingCardProps {
  booking: any;
  type: "room" | "equipment";
  onRefresh?: (bookingId: string) => void;
  onRefund?: (bookingId: string, reason?: string) => void;
  onCancel?: (bookingId: string) => void;
  isRefreshing?: boolean;
}

export const BookingCard = ({
  booking,
  type,
  onRefresh,
  onRefund,
  onCancel,
  isRefreshing = false,
}: BookingCardProps) => {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const formatTime = (startTime: string, endTime: string) => {
    const start = format(new Date(startTime), "HH:mm");
    const end = format(new Date(endTime), "HH:mm");
    return `${start} - ${end}`;
  };

  const getItemName = () => {
    if (type === "room") return booking.room?.name || "Sala não identificada";
    return booking.equipment?.name || "Equipamento não identificado";
  };

  const getIcon = () => {
    return type === "room" ? <MapPin className="h-4 w-4" /> : <Package className="h-4 w-4" />;
  };

  const canRefresh = booking.status === "in_process" || booking.status === "pre_authorized";
  const canRefund = booking.status === "paid" && booking.payment_method && 
                   (booking.payment_method === "pix" || booking.payment_method === "cartao");
  const canCancel = booking.status === "pending";

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getIcon()}
            <CardTitle className="text-lg">{getItemName()}</CardTitle>
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(booking.start_time)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatTime(booking.start_time, booking.end_time)}</span>
          </div>
          
          {type === "equipment" && booking.quantity && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>Quantidade: {booking.quantity}</span>
            </div>
          )}
        </div>

        {booking.equipment?.description && type === "equipment" && (
          <p className="text-sm text-muted-foreground">{booking.equipment.description}</p>
        )}

        {booking.room?.description && type === "room" && (
          <p className="text-sm text-muted-foreground">{booking.room.description}</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-lg font-semibold">
            {formatCurrency(booking.total_price || 0)}
          </div>
          
          <div className="flex items-center gap-2">
            <InvoiceDownload
              bookingId={type === "room" ? booking.id : undefined}
              equipmentBookingId={type === "equipment" ? booking.id : undefined}
              status={booking.status}
            />
            
            {canRefresh && onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRefresh(booking.id)}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
            
            {canRefund && onRefund && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRefund(booking.id)}
              >
                <Undo2 className="h-4 w-4" />
                Estorno
              </Button>
            )}
            
            {canCancel && onCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(booking.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};