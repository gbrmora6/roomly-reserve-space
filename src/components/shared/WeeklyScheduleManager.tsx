import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

export interface WeeklySchedule {
  weekday: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time: string;
  end_time: string;
}

interface WeeklyScheduleManagerProps {
  schedules: WeeklySchedule[];
  onChange: (schedules: WeeklySchedule[]) => void;
}

const WEEKDAYS = [
  { value: 'monday', label: 'Segunda-feira' },
  { value: 'tuesday', label: 'Terça-feira' },
  { value: 'wednesday', label: 'Quarta-feira' },
  { value: 'thursday', label: 'Quinta-feira' },
  { value: 'friday', label: 'Sexta-feira' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
] as const;

export const WeeklyScheduleManager: React.FC<WeeklyScheduleManagerProps> = ({
  schedules,
  onChange,
}) => {
  const handleAddSchedule = () => {
    const newSchedule: WeeklySchedule = {
      weekday: 'monday',
      start_time: '08:00',
      end_time: '18:00'
    };
    onChange([...schedules, newSchedule]);
  };

  const handleRemoveSchedule = (index: number) => {
    const newSchedules = schedules.filter((_, i) => i !== index);
    onChange(newSchedules);
  };

  const handleScheduleChange = (
    index: number,
    field: keyof WeeklySchedule,
    value: string
  ) => {
    const newSchedules = [...schedules];
    newSchedules[index] = {
      ...newSchedules[index],
      [field]: value
    };
    onChange(newSchedules);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Horários por Dia da Semana</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddSchedule}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Horário
        </Button>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-muted-foreground">
            Nenhum horário configurado. Clique em "Adicionar Horário" para começar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 border rounded-lg bg-card"
            >
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`weekday-${index}`}>Dia da Semana</Label>
                  <Select
                    value={schedule.weekday}
                    onValueChange={(value) =>
                      handleScheduleChange(index, 'weekday', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`start-time-${index}`}>Horário de Início</Label>
                  <Input
                    id={`start-time-${index}`}
                    type="time"
                    value={schedule.start_time}
                    onChange={(e) =>
                      handleScheduleChange(index, 'start_time', e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`end-time-${index}`}>Horário de Término</Label>
                  <Input
                    id={`end-time-${index}`}
                    type="time"
                    value={schedule.end_time}
                    onChange={(e) =>
                      handleScheduleChange(index, 'end_time', e.target.value)
                    }
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRemoveSchedule(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p>Configure horários específicos para cada dia da semana.</p>
        <p>Exemplo: Segunda das 8h às 18h, Terça das 9h às 15h, etc.</p>
      </div>
    </div>
  );
};