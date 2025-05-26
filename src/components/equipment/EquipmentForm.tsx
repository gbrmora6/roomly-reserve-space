
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeekdaySelector } from "@/components/shared/WeekdaySelector";
import { Upload, X } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type WeekdayEnum = Database["public"]["Enums"]["weekday"];

const equipmentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantidade deve ser maior que zero"),
  price_per_hour: z.coerce.number().min(0.01, "Preço deve ser maior que zero"),
  open_time: z.string().optional(),
  close_time: z.string().optional(),
  open_days: z.array(z.enum([
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
  ])).optional(),
});

type EquipmentFormValues = z.infer<typeof equipmentSchema>;

interface EquipmentFormProps {
  initialData?: any;
  onSubmit: (data: EquipmentFormValues & { photos?: File[] }) => void;
  isSubmitting: boolean;
}

export const EquipmentForm: React.FC<EquipmentFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting,
}) => {
  const [photos, setPhotos] = useState<File[]>([]);
  
  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      quantity: initialData?.quantity || 1,
      price_per_hour: initialData?.price_per_hour || 0,
      open_time: initialData?.open_time || "08:00",
      close_time: initialData?.close_time || "18:00",
      open_days: initialData?.open_days || ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    setPhotos((prev) => [...prev, ...newFiles]);
  };
  
  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (data: EquipmentFormValues) => {
    onSubmit({ ...data, photos });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? "Editar Equipamento" : "Novo Equipamento"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Equipamento *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Digite o nome do equipamento"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Descreva o equipamento"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    {...form.register("quantity")}
                  />
                  {form.formState.errors.quantity && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.quantity.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="price_per_hour">Preço por Hora (R$) *</Label>
                  <Input
                    id="price_per_hour"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("price_per_hour")}
                  />
                  {form.formState.errors.price_per_hour && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.price_per_hour.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="open_time">Horário de Abertura</Label>
                  <Input
                    id="open_time"
                    type="time"
                    {...form.register("open_time")}
                  />
                </div>

                <div>
                  <Label htmlFor="close_time">Horário de Fechamento</Label>
                  <Input
                    id="close_time"
                    type="time"
                    {...form.register("close_time")}
                  />
                </div>
              </div>

              <div>
                <Label>Dias de Funcionamento</Label>
                <WeekdaySelector
                  value={form.watch("open_days") || []}
                  onChange={(days) => form.setValue("open_days", days as WeekdayEnum[])}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Fotos do Equipamento</Label>
                
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
                    {photos.map((file, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={`Pré-visualização ${index}`} 
                          className="w-full h-32 object-cover rounded-md"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemovePhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-2">
                  <Label htmlFor="photos" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center hover:border-gray-400 transition-colors">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">
                        Clique para selecionar ou arraste as fotos aqui
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PNG, JPG, GIF até 10MB
                      </p>
                    </div>
                    <Input
                      id="photos"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Equipamento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
