import React from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { WeeklyScheduleManager, WeeklySchedule } from "@/components/shared/WeeklyScheduleManager";

interface EquipmentFormData {
  name: string;
  description: string;
  quantity: number;
  price_per_hour: number;
  schedules: WeeklySchedule[];
}

interface EquipmentFormProps {
  initialData?: EquipmentFormData;
  onSubmit: (data: EquipmentFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function EquipmentFormUpdated({ initialData, onSubmit, isSubmitting }: EquipmentFormProps) {
  const form = useForm<EquipmentFormData>({
    defaultValues: initialData || {
      name: "",
      description: "",
      quantity: 1,
      price_per_hour: 0,
      schedules: []
    }
  });

  const handleFormSubmit = async (data: EquipmentFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Equipamento</FormLabel>
              <FormControl>
                <Input {...field} required />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade Disponível</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    {...field} 
                    onChange={e => field.onChange(parseInt(e.target.value))}
                    required 
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price_per_hour"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço por Hora (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value))}
                    required 
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="schedules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Horários de Funcionamento</FormLabel>
              <FormControl>
                <WeeklyScheduleManager 
                  schedules={field.value} 
                  onChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar Equipamento"}
        </Button>
      </form>
    </Form>
  );
}