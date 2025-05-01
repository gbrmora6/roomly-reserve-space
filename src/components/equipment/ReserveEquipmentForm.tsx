
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { TimeSelector } from "@/components/rooms/TimeSelector";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/formatCurrency";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
  open_time?: string;
  close_time?: string;
  open_days?: string[];
}

interface ReserveEquipmentFormProps {
  equipment: Equipment;
  onClose: () => void;
  filters?: {
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
  };
}

export const ReserveEquipmentForm: React.FC<ReserveEquipmentFormProps> = ({
  equipment,
  onClose,
  filters,
}) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(filters?.date || null);
  const [startHour, setStartHour] = useState<string>(filters?.startTime || "");
  const [endHour, setEndHour] = useState<string>(filters?.endTime || "");
  const [quantity, setQuantity] = useState<number>(1);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const startHourRef = useRef<HTMLDivElement>(null);
  const endHourRef = useRef<HTMLDivElement>(null);
  
  // Generate available hours based on equipment settings
  const getAvailableHours = () => {
    if (!equipment.open_time || !equipment.close_time) {
      return Array.from({ length: 16 }, (_, i) => {
        const hour = i + 7;
        return `${hour.toString().padStart(2, '0')}:00`;
      });
    }

    const startHour = parseInt(equipment.open_time.split(":")[0]);
    const endHour = parseInt(equipment.close_time.split(":")[0]);
    
    return Array.from({ length: endHour - startHour }, (_, i) => {
      const hour = i + startHour;
      return `${hour.toString().padStart(2, '0')}:00`;
    });
  };

  const availableHours = getAvailableHours();

  // Calculate booking price when relevant fields change
  React.useEffect(() => {
    if (selectedDate && startHour && endHour && quantity) {
      // Calculate duration in hours
      const startParts = startHour.split(":");
      const endParts = endHour.split(":");
      
      const startHourNum = parseInt(startParts[0]);
      const endHourNum = parseInt(endParts[0]);
      
      let durationHours = endHourNum - startHourNum;
      
      if (durationHours <= 0) {
        durationHours = 0;
      }
      
      // Calculate total price
      const total = equipment.price_per_hour * durationHours * quantity;
      setBookingTotal(total);
    }
  }, [selectedDate, startHour, endHour, quantity, equipment.price_per_hour]);

  // Scroll to sections when selections are made
  React.useEffect(() => {
    if (selectedDate && !startHour) {
      setTimeout(() => startHourRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [selectedDate]);

  React.useEffect(() => {
    if (startHour) {
      setTimeout(() => endHourRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [startHour]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setStartHour("");
      setEndHour("");
    }
  };

  const handleStartHourSelect = (hour: string) => {
    setStartHour(hour);
    setEndHour("");
  };

  const isDateDisabled = (date: Date) => {
    if (!equipment.open_days || equipment.open_days.length === 0) {
      return false;
    }
    
    const weekday = format(date, "eeee", { locale: ptBR }).toLowerCase();
    const weekdayEnglish = {
      'segunda-feira': 'monday',
      'terça-feira': 'tuesday',
      'quarta-feira': 'wednesday',
      'quinta-feira': 'thursday',
      'sexta-feira': 'friday',
      'sábado': 'saturday',
      'domingo': 'sunday'
    }[weekday] || weekday;
    
    return !equipment.open_days.includes(weekdayEnglish);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para fazer uma reserva");
      return;
    }

    if (!selectedDate || !startHour || !endHour) {
      toast.error("Por favor, selecione data e horários");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create date objects for start and end times
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      
      const [startHours, startMinutes] = startHour.split(":");
      const [endHours, endMinutes] = endHour.split(":");
      
      startDate.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
      endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      // Convert times to UTC-3
      const utcStartTime = setHours(startDate, startDate.getHours() - 3);
      const utcEndTime = setHours(endDate, endDate.getHours() - 3);

      // Create equipment booking directly without linking to a room booking
      const { error: equipmentError } = await supabase
        .from("booking_equipment")
        .insert({
          equipment_id: equipment.id,
          quantity: quantity,
          user_id: user.id,
          start_time: utcStartTime.toISOString(),
          end_time: utcEndTime.toISOString(),
          status: "pending",
        });

      if (equipmentError) throw equipmentError;

      toast.success("Reserva realizada com sucesso!");
      onClose();
    } catch (error: any) {
      toast.error(`Erro ao fazer reserva: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader className="sticky top-0 z-10 bg-card border-b">
        <CardTitle className="text-2xl font-bold text-primary">
          Reservar {equipment.name}
        </CardTitle>
      </CardHeader>
      <ScrollArea className="h-[80vh] overflow-auto">
        <CardContent className="space-y-6 p-6">
          <div className="bg-card rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-medium mb-3">Selecione uma data</h3>
            <Calendar
              mode="single"
              selected={selectedDate!}
              onSelect={handleDateSelect}
              className="rounded-md border pointer-events-auto mx-auto"
              disabled={isDateDisabled}
              locale={ptBR}
            />
          </div>

          {selectedDate && availableHours.length > 0 && (
            <div className="space-y-4">
              <div ref={startHourRef} className="bg-card rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium mb-3">Horário de início</h3>
                <TimeSelector
                  hours={availableHours}
                  blockedHours={[]}
                  selectedHour={startHour}
                  onSelectHour={handleStartHourSelect}
                />
              </div>

              {startHour && (
                <div ref={endHourRef} className="bg-card rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-medium mb-3">Horário de término</h3>
                  <TimeSelector
                    hours={availableHours}
                    blockedHours={[]}
                    selectedHour={endHour}
                    onSelectHour={setEndHour}
                    isEndTime
                    startHour={startHour}
                  />
                </div>
              )}

              {endHour && (
                <div className="bg-card rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-medium mb-3">Quantidade</h3>
                  <div className="flex items-center gap-2 justify-center">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      disabled={quantity <= 1}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-medium">{quantity}</span>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setQuantity(prev => Math.min(equipment.quantity, prev + 1))}
                      disabled={quantity >= equipment.quantity}
                    >
                      +
                    </Button>
                  </div>
                </div>
              )}
              
              {endHour && bookingTotal > 0 && (
                <div className="bg-card rounded-lg p-4 shadow-sm text-center">
                  <h3 className="text-lg font-medium mb-2">Resumo da reserva</h3>
                  <p className="text-sm text-gray-500">Valor total da reserva</p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(bookingTotal)}
                  </p>
                </div>
              )}
            </div>
          )}

          {selectedDate && availableHours.length === 0 && (
            <div className="text-center py-6">
              <p className="text-red-500 font-medium">
                Nenhum horário disponível para este equipamento.
              </p>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-32"
            >
              Cancelar
            </Button>
            {startHour && endHour && (
              <Button
                onClick={handleSubmit}
                disabled={!selectedDate || !startHour || !endHour || isSubmitting}
                className="w-32"
              >
                {isSubmitting ? "Reservando..." : "Confirmar"}
              </Button>
            )}
          </DialogFooter>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
