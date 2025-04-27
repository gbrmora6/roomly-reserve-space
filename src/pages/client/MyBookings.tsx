
import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { BookingChat } from "@/components/bookings/BookingChat";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

const MyBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          room:rooms(
            name,
            price_per_hour
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleCancelBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a reserva.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Reserva cancelada com sucesso.",
      });
      refetch();
    }
  };

  const handleShowAddress = async () => {
    const { data, error } = await supabase
      .from("company_profile")
      .select("*")
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar o endereço.",
        variant: "destructive",
      });
    } else {
      setCompanyProfile(data);
      setShowAddressDialog(true);
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      return format(date, "HH:mm", { locale: ptBR });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Horário inválido";
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <p>Carregando reservas...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Minhas Reservas</h1>
          <Button onClick={handleShowAddress} variant="outline" size="sm">
            <MapPin className="mr-2 h-4 w-4" />
            Ver Endereço
          </Button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sala</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chat</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings?.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{booking.room?.name}</TableCell>
                  <TableCell>
                    {format(new Date(booking.start_time), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(booking.start_time)} - {formatDateTime(booking.end_time)}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(booking.total_price)}
                  </TableCell>
                  <TableCell>
                    <BookingStatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell>
                    <BookingChat bookingId={booking.id} />
                  </TableCell>
                  <TableCell>
                    {booking.status !== "cancelled" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!bookings?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    Nenhuma reserva encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Endereço da Empresa</DialogTitle>
            </DialogHeader>
            {companyProfile && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="font-medium">{companyProfile.name}</p>
                  <p>
                    {companyProfile.street}, {companyProfile.number}
                  </p>
                  <p>
                    {companyProfile.neighborhood} - {companyProfile.city}
                  </p>
                </div>
                <div className="aspect-video w-full">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3665.669201737705!2d-51.146633123694864!3d-23.327584484793713!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94eb430cb6418799%3A0xb53bc453948260de!2sR.%20Augusto%20Severo%2C%2010%20-%20Santos%20Dumont%2C%20Londrina%20-%20PR%2C%2086039-650!5e0!3m2!1spt-BR!2sbr!4v1708436845599!5m2!1spt-BR!2sbr"
                    className="w-full h-full rounded-md border-0"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default MyBookings;
