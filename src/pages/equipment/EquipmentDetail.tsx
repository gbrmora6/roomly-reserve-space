
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Package, Plus, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { TimeSelector } from "@/components/shared/TimeSelector";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/utils/formatCurrency";
import { Separator } from "@/components/ui/separator";
import ProductSuggestions from "@/components/cart/ProductSuggestions";

const EquipmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [blockedHours, setBlockedHours] = useState<string[]>([]);

  const { data: equipment, isLoading } = useQuery({
    queryKey: ["equipment-detail", id],
    queryFn: async () => {
      if (!id) throw new Error("ID do equipamento não fornecido");

      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleAddToCart = () => {
    if (!equipment || !selectedDate || !selectedStartTime || !selectedEndTime) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Por favor, selecione data, horário de início e fim",
      });
      return;
    }

    if (quantity > equipment.quantity) {
      toast({
        variant: "destructive",
        title: "Quantidade indisponível",
        description: `Máximo disponível: ${equipment.quantity} unidades`,
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
    const totalPrice = equipment.price_per_hour * duration * quantity;

    addToCart({
      itemType: "equipment",
      itemId: equipment.id,
      quantity: quantity,
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
      title: "Equipamento adicionado ao carrinho!",
      description: `${equipment.name} foi reservado temporariamente por 15 minutos`,
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

  if (!equipment) {
    return (
      <MainLayout>
        <div className="container py-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Equipamento não encontrado</h1>
            <Button onClick={() => navigate("/equipment")}>Voltar para Equipamentos</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Fetch available hours when date changes
  useEffect(() => {
    const fetchAvailableHours = async () => {
      if (!selectedDate || !equipment) {
        setAvailableHours([]);
        setBlockedHours([]);
        return;
      }

      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        
        console.log("Buscando disponibilidade para equipamento:", equipment.id, "data:", dateStr);
        
        const { data: availabilityData, error } = await supabase
          .rpc("get_equipment_availability", {
            p_equipment_id: equipment.id,
            p_date: dateStr,
            p_requested_quantity: quantity
          });

        if (error) {
          console.error("Error fetching equipment availability:", error);
          return;
        }

        console.log("Dados de disponibilidade recebidos:", availabilityData);

        if (!availabilityData || availabilityData.length === 0) {
          console.log(`Equipamento ${equipment.name} fechado na data ${dateStr}`);
          setAvailableHours([]);
          setBlockedHours([]);
          return;
        }

        // Separar horários disponíveis e bloqueados
        const available: string[] = [];
        const blocked: string[] = [];
        
        availabilityData.forEach((slot: any) => {
          if (slot.is_available) {
            available.push(slot.hour);
          } else {
            blocked.push(slot.hour);
          }
        });
        
        console.log("Horários disponíveis:", available);
        console.log("Horários bloqueados:", blocked);

        setAvailableHours(available);
        setBlockedHours(blocked);
      } catch (error) {
        console.error("Error in fetchAvailableHours:", error);
        setAvailableHours([]);
        setBlockedHours([]);
      }
    };

    fetchAvailableHours();
  }, [selectedDate, equipment, quantity]);

  return (
    <MainLayout>
      <div className="container py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informações do Equipamento */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {equipment.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{equipment.description}</p>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">Preço</h3>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(equipment.price_per_hour)}/hora
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Disponibilidade</h3>
                  <p className="text-sm text-muted-foreground">
                    {equipment.quantity} unidades disponíveis
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Horário de Funcionamento</h3>
                  <p className="text-sm text-muted-foreground">
                    Varia por dia da semana - consulte na reserva
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Produtos Relacionados */}
            <ProductSuggestions equipmentId={equipment.id} />
          </div>

          {/* Formulário de Reserva */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Reservar Equipamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Quantidade</h3>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-medium min-w-[3ch] text-center">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.min(equipment.quantity, quantity + 1))}
                      disabled={quantity >= equipment.quantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

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
                        requireConsecutive={true}
                        minimumIntervalMinutes={equipment?.minimum_interval_minutes || 60}
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
                          <span>Quantidade:</span>
                          <span>{quantity} unidades</span>
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
                              return formatCurrency(equipment.price_per_hour * duration * quantity);
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
                        * O equipamento será reservado temporariamente por 15 minutos para você finalizar o pagamento
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

export default EquipmentDetail;
