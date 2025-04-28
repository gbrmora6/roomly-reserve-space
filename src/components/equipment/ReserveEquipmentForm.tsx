
import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TimeSelector } from "@/components/rooms/TimeSelector";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_per_hour: number;
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

const formSchema = z.object({
  date: z.date({
    required_error: "A data é obrigatória.",
  }),
  startTime: z.string().min(1, "O horário de início é obrigatório."),
  endTime: z.string().min(1, "O horário de término é obrigatório."),
  quantity: z.number().min(1, "A quantidade deve ser pelo menos 1"),
});

export const ReserveEquipmentForm: React.FC<ReserveEquipmentFormProps> = ({
  equipment,
  onClose,
  filters,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const endTimeRef = useRef<HTMLButtonElement>(null);
  
  const [bookingTotal, setBookingTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate hours from 7:00 to 22:00 for time selection
  const hours = Array.from({ length: 16 }, (_, i) => {
    const hour = i + 7;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: filters?.date || undefined,
      startTime: filters?.startTime || "",
      endTime: filters?.endTime || "",
      quantity: 1,
    },
  });

  const watchDate = form.watch("date");
  const watchStartTime = form.watch("startTime");
  const watchEndTime = form.watch("endTime");
  const watchQuantity = form.watch("quantity");

  // Calculate booking price when relevant fields change
  useEffect(() => {
    if (watchDate && watchStartTime && watchEndTime && watchQuantity) {
      // Calculate duration in hours
      const startParts = watchStartTime.split(":");
      const endParts = watchEndTime.split(":");
      
      const startHours = parseInt(startParts[0]);
      const startMinutes = parseInt(startParts[1]);
      const endHours = parseInt(endParts[0]);
      const endMinutes = parseInt(endParts[1]);
      
      // Calculate total minutes and convert to hours
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;
      let durationHours = (endTotalMinutes - startTotalMinutes) / 60;
      
      if (durationHours <= 0) {
        durationHours = 0;
      }
      
      // Calculate total price
      const total = equipment.price_per_hour * durationHours * watchQuantity;
      setBookingTotal(total);
    }
  }, [watchDate, watchStartTime, watchEndTime, watchQuantity, equipment.price_per_hour]);

  // Scroll to end time selector when start time is selected
  useEffect(() => {
    if (watchStartTime && endTimeRef.current) {
      endTimeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [watchStartTime]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para fazer uma reserva",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create date objects for start and end times
      const startDate = new Date(data.date);
      const endDate = new Date(data.date);
      
      const [startHours, startMinutes] = data.startTime.split(":");
      const [endHours, endMinutes] = data.endTime.split(":");
      
      startDate.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
      endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      // Create booking first
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          room_id: null, // No room for equipment-only booking
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          status: "pending",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Then create equipment booking with all required fields
      const { error: equipmentError } = await supabase
        .from("booking_equipment")
        .insert({
          booking_id: booking.id,
          equipment_id: equipment.id,
          quantity: data.quantity,
          user_id: user.id,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          status: "pending",
        });

      if (equipmentError) throw equipmentError;

      toast({
        title: "Reserva realizada com sucesso!",
        description: "Sua reserva foi enviada para aprovação.",
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao fazer reserva",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="mb-4 pb-4 border-b">
          <h3 className="font-semibold text-lg">{equipment.name}</h3>
          {equipment.description && (
            <p className="text-sm text-muted-foreground">{equipment.description}</p>
          )}
          <p className="text-sm mt-2">
            <span className="font-medium">Preço:</span> {formatCurrency(equipment.price_per_hour)} / hora
          </p>
        </div>

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Horário de início</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={!form.getValues("date")}
                      >
                        {field.value ? (
                          field.value
                        ) : (
                          <span>Selecione o horário</span>
                        )}
                        <Clock className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3">
                      <TimeSelector
                        hours={hours}
                        blockedHours={[]}
                        selectedHour={field.value}
                        onSelectHour={(time) => field.onChange(time)}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Horário de término</FormLabel>
                <Popover>
                  <PopoverTrigger asChild ref={endTimeRef}>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={!form.getValues("startTime")}
                      >
                        {field.value ? (
                          field.value
                        ) : (
                          <span>Selecione o horário</span>
                        )}
                        <Clock className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3">
                      <TimeSelector
                        hours={hours}
                        blockedHours={[]}
                        selectedHour={field.value}
                        onSelectHour={(time) => field.onChange(time)}
                        isEndTime
                        startHour={form.getValues("startTime")}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max={equipment.quantity}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {bookingTotal > 0 && (
          <div className="p-4 bg-blue-50 rounded-md text-center">
            <p className="text-sm text-gray-500">Valor total da reserva</p>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(bookingTotal)}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Processando..." : "Confirmar Reserva"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
