
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Users, Wifi, Wind, Tv, Bath, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { TimeSelector } from "@/components/rooms/TimeSelector";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/utils/formatCurrency";
import { Separator } from "@/components/ui/separator";

const RoomDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);

  const { data: room, isLoading } = useQuery({
    queryKey: ["room-detail", id],
    queryFn: async () => {
      if (!id) throw new Error("ID da sala não fornecido");

      const { data, error } = await supabase
        .from("rooms")
        .select(`
          *,
          room_photos (
            id,
            url
          )
        `)
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleAddToCart = () => {
    if (!room || !selectedDate || !selectedStartTime || !selectedEndTime) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Por favor, selecione data, horário de início e fim",
      });
      return;
    }

    const startDate = new Date(selectedDate);
    const [startHour, startMinute] = selectedStartTime.split(":");
    startDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

    const endDate = new Date(selectedDate);
    const [endHour, endMinute] = selectedEndTime.split(":");
    endDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const totalPrice = room.price_per_hour * duration;

    addToCart({
      itemType: "room",
      itemId: room.id,
      quantity: 1,
      metadata: {
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        date: format(selectedDate, "dd/MM/yyyy"),
        start_time_display: selectedStartTime,
        end_time_display: selectedEndTime,
        duration: duration,
        total_price: totalPrice
      }
    });

    toast({
      title: "Sala adicionada ao carrinho!",
      description: `${room.name} foi reservada temporariamente por 15 minutos`,
    });

    navigate("/cart");
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-10">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!room) {
    return (
      <MainLayout>
        <div className="container py-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Sala não encontrada</h1>
            <Button onClick={() => navigate("/rooms")}>Voltar para Salas</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const availableHours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  const blockedHours: string[] = [];

  return (
    <MainLayout>
      <div className="container py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Imagens e Informações */}
          <div className="space-y-6">
            {/* Galeria de Fotos */}
            {room.room_photos && room.room_photos.length > 0 && (
              <div className="space-y-4">
                <img
                  src={room.room_photos[0].url}
                  alt={room.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
                {room.room_photos.length > 1 && (
                  <div className="grid grid-cols-3 gap-2">
                    {room.room_photos.slice(1, 4).map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.url}
                        alt={room.name}
                        className="w-full h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Informações da Sala */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {room.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{room.description}</p>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">Preço</h3>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(room.price_per_hour)}/hora
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="font-semibold">Comodidades</h3>
                  <div className="flex flex-wrap gap-2">
                    {room.has_wifi && (
                      <Badge variant="secondary">
                        <Wifi className="h-3 w-3 mr-1" />
                        Wi-Fi
                      </Badge>
                    )}
                    {room.has_ac && (
                      <Badge variant="secondary">
                        <Wind className="h-3 w-3 mr-1" />
                        Ar Condicionado
                      </Badge>
                    )}
                    {room.has_tv && (
                      <Badge variant="secondary">
                        <Tv className="h-3 w-3 mr-1" />
                        TV
                      </Badge>
                    )}
                    {room.has_private_bathroom && (
                      <Badge variant="secondary">
                        <Bath className="h-3 w-3 mr-1" />
                        Banheiro Privativo
                      </Badge>
                    )}
                    {room.has_tables && (
                      <Badge variant="secondary">Mesa</Badge>
                    )}
                    {room.has_chairs && (
                      <Badge variant="secondary">Cadeiras</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Horário de Funcionamento</h3>
                  <p className="text-sm text-muted-foreground">
                    Varia por dia da semana - consulte na reserva
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulário de Reserva */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Reservar Sala
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Selecione a data</h3>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSelectedStartTime(null);
                      setSelectedEndTime(null);
                    }}
                    locale={ptBR}
                    className="border rounded-md p-2"
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                  />
                </div>

                {selectedDate && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Horário
                      </h3>
                      <TimeSelector
                        availableHours={availableHours}
                        blockedHours={blockedHours}
                        selectedStartTime={selectedStartTime}
                        selectedEndTime={selectedEndTime}
                        onSelectStartTime={setSelectedStartTime}
                        onSelectEndTime={setSelectedEndTime}
                      />
                    </div>
                  </>
                )}

                {selectedStartTime && selectedEndTime && selectedDate && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="font-medium">Resumo da Reserva</h3>
                      <div className="bg-muted p-4 rounded-md space-y-2">
                        <div className="flex justify-between">
                          <span>Data:</span>
                          <span>{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Horário:</span>
                          <span>{selectedStartTime} - {selectedEndTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Duração:</span>
                          <span>
                            {(() => {
                              const start = new Date();
                              const [startHour, startMinute] = selectedStartTime.split(":");
                              start.setHours(parseInt(startHour), parseInt(startMinute));
                              
                              const end = new Date();
                              const [endHour, endMinute] = selectedEndTime.split(":");
                              end.setHours(parseInt(endHour), parseInt(endMinute));
                              
                              const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                              return `${duration}h`;
                            })()}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total:</span>
                          <span>
                            {(() => {
                              const start = new Date();
                              const [startHour, startMinute] = selectedStartTime.split(":");
                              start.setHours(parseInt(startHour), parseInt(startMinute));
                              
                              const end = new Date();
                              const [endHour, endMinute] = selectedEndTime.split(":");
                              end.setHours(parseInt(endHour), parseInt(endMinute));
                              
                              const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                              return formatCurrency(room.price_per_hour * duration);
                            })()}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={handleAddToCart}
                        className="w-full"
                        size="lg"
                      >
                        Adicionar ao Carrinho
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        * A sala será reservada temporariamente por 15 minutos para você finalizar o pagamento
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default RoomDetail;
