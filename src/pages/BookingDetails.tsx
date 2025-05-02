
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatCurrency";
import { Separator } from "@/components/ui/separator";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const BookingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<"room" | "equipment">("room");

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        // First try to fetch as a room booking
        const { data: roomBooking, error: roomError } = await supabase
          .from("bookings")
          .select(`
            *,
            room:rooms(
              name,
              price_per_hour
            ),
            booking_equipment:booking_equipment(
              quantity,
              equipment:equipment(
                name,
                price_per_hour
              )
            )
          `)
          .eq("id", id)
          .single();

        if (!roomError && roomBooking) {
          setBooking(roomBooking);
          setBookingType("room");
          setLoading(false);
          return;
        }

        // If not found, try as an equipment booking
        const { data: equipmentBooking, error: equipmentError } = await supabase
          .from("booking_equipment")
          .select(`
            *,
            equipment:equipment(
              name,
              price_per_hour
            )
          `)
          .eq("id", id)
          .single();

        if (!equipmentError && equipmentBooking) {
          setBooking(equipmentBooking);
          setBookingType("equipment");
          setLoading(false);
          return;
        }

        // If neither is found, set error
        setError("Reserva não encontrada");
        setLoading(false);
      } catch (error) {
        console.error("Erro ao buscar detalhes da reserva:", error);
        setError("Erro ao carregar os detalhes da reserva");
        setLoading(false);
      }
    };

    if (id) {
      fetchBookingDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <p>Carregando detalhes da reserva...</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !booking) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-red-500">{error || "Reserva não encontrada"}</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const startDate = new Date(booking.start_time);
  const endDate = new Date(booking.end_time);
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  const formattedDate = format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedStartTime = format(startDate, "HH:mm");
  const formattedEndTime = format(endDate, "HH:mm");

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
            <div>
              <h3 className="text-lg font-semibold mb-2">Informações Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">{formattedDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Horário</p>
                  <p className="font-medium">{formattedStartTime} às {formattedEndTime}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duração</p>
                  <p className="font-medium">{durationHours} horas</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-medium text-xl text-primary">{formatCurrency(booking.total_price)}</p>
                </div>
              </div>
            </div>

            <Separator />

            {bookingType === "room" && booking.room && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Sala Reservada</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome da Sala</p>
                    <p className="font-medium">{booking.room.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preço por hora</p>
                    <p className="font-medium">{formatCurrency(booking.room.price_per_hour)}</p>
                  </div>
                </div>
              </div>
            )}

            {bookingType === "equipment" && booking.equipment && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Equipamento Reservado</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome do Equipamento</p>
                    <p className="font-medium">{booking.equipment.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quantidade</p>
                    <p className="font-medium">{booking.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preço por hora</p>
                    <p className="font-medium">{formatCurrency(booking.equipment.price_per_hour)}</p>
                  </div>
                </div>
              </div>
            )}

            {bookingType === "room" && booking.booking_equipment && booking.booking_equipment.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Equipamentos Adicionais</h3>
                <div className="space-y-2">
                  {booking.booking_equipment.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded-md">
                      <div>
                        <p className="font-medium">{item.equipment.name}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(item.equipment.price_per_hour)}/hora</p>
                      </div>
                      <Badge variant="outline">{item.quantity}x</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default BookingDetails;
