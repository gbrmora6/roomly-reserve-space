import React, { useState } from "react";
import { BookingCard } from "@/components/bookings/BookingCard";
import { BookingStats } from "@/components/bookings/BookingStats";
import { RefundModal } from "@/components/orders/RefundModal";
import { Calendar, Package } from "lucide-react";

interface BookingCardListProps {
  bookings: any[];
  type: "room" | "equipment";
  onRefresh: (bookingId: string) => void;
  onCancel: (bookingId: string, type: "room" | "equipment") => void;
  onRefund: (bookingId: string, reason?: string) => void;
  isRefreshing?: boolean;
}

export const BookingCardList = ({
  bookings,
  type,
  onRefresh,
  onCancel,
  onRefund,
  isRefreshing = false,
}: BookingCardListProps) => {
  const [refundModal, setRefundModal] = useState<{ open: boolean; booking: any }>({
    open: false,
    booking: null,
  });

  const handleRefundClick = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      console.log("Opening refund modal for booking:", booking);
      setRefundModal({ open: true, booking });
    } else {
      console.error("Booking not found for ID:", bookingId);
    }
  };

  const handleRefundConfirm = (reason?: string) => {
    if (refundModal.booking) {
      console.log("Confirming refund for booking:", refundModal.booking.id);
      onRefund(refundModal.booking.id, reason);
      setRefundModal({ open: false, booking: null });
    } else {
      console.error("No booking data available for refund");
    }
  };

  const handleCancelClick = (bookingId: string) => {
    onCancel(bookingId, type);
  };

  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center py-12">
        {type === "room" ? (
          <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        ) : (
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        )}
        <h3 className="text-lg font-medium mb-2">
          {type === "room" ? "Nenhuma reserva de sala encontrada" : "Nenhuma reserva de equipamento encontrada"}
        </h3>
        <p className="text-muted-foreground">
          {type === "room" 
            ? "Quando você fizer uma reserva de sala, ela aparecerá aqui."
            : "Quando você fizer uma reserva de equipamento, ela aparecerá aqui."
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BookingStats bookings={bookings} type={type} />
      
      <div className="space-y-4">
        {bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            type={type}
            onRefresh={onRefresh}
            onRefund={handleRefundClick}
            onCancel={handleCancelClick}
            isRefreshing={isRefreshing}
          />
        ))}
      </div>

      {refundModal.booking && (
        <RefundModal
          open={refundModal.open}
          onOpenChange={(open) => setRefundModal({ open, booking: open ? refundModal.booking : null })}
          order={refundModal.booking}
          onConfirm={handleRefundConfirm}
        />
      )}
    </div>
  );
};