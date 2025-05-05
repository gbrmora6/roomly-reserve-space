
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { BookingDetailsState } from "@/components/bookings/BookingDetailsState";
import { BookingGeneralInfo } from "@/components/bookings/BookingGeneralInfo";
import { BookingRoomDetails } from "@/components/bookings/BookingRoomDetails";
import { BookingEquipmentDetails } from "@/components/bookings/BookingEquipmentDetails";
import { BookingAdditionalEquipment } from "@/components/bookings/BookingAdditionalEquipment";
import { useBookingDetails } from "@/hooks/useBookingDetails";
import { Database } from "@/integrations/supabase/types";
import { ClientDetailsModal } from "@/components/bookings/ClientDetailsModal";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const BookingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { booking, loading, error, bookingType } = useBookingDetails(id);
  const [showClientModal, setShowClientModal] = useState(false);

  // Show loading or error states
  if (loading || error || !booking) {
    return (
      <MainLayout>
        <BookingDetailsState loading={loading} error={error} />
      </MainLayout>
    );
  }

  const startDate = new Date(booking.start_time);
  const endDate = new Date(booking.end_time);

  return (
    <MainLayout>
      <div className="container py-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">Detalhes da Reserva</CardTitle>
              <BookingStatusBadge status={booking.status as BookingStatus} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <BookingGeneralInfo
              startDate={startDate}
              endDate={endDate}
              totalPrice={booking.total_price}
            />

            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowClientModal(true)}
                className="flex items-center gap-2"
              >
                <User size={16} />
                Ver Detalhes do Cliente
              </Button>
            </div>

            <Separator />

            {bookingType === "room" && booking.room && (
              <BookingRoomDetails room={booking.room} />
            )}

            {bookingType === "equipment" && booking.equipment && (
              <BookingEquipmentDetails 
                equipment={booking.equipment} 
                quantity={booking.quantity || 1} 
              />
            )}

            {bookingType === "room" && booking.booking_equipment && booking.booking_equipment.length > 0 && (
              <BookingAdditionalEquipment equipmentItems={booking.booking_equipment} />
            )}
          </CardContent>
        </Card>
      </div>

      {booking.user_id && (
        <ClientDetailsModal 
          isOpen={showClientModal} 
          onClose={() => setShowClientModal(false)} 
          userId={booking.user_id}
        />
      )}
    </MainLayout>
  );
};

export default BookingDetails;
