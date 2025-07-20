import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface RoomSchedule {
  weekday: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time: string;
  end_time: string;
}

interface RoomScheduleManagerProps {
  schedules: RoomSchedule[];
  onAddSchedule: () => void;
  onRemoveSchedule: (index: number) => void;
  onScheduleChange: (index: number, field: keyof RoomSchedule, value: string) => void;
}

const WEEKDAYS = [
  'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'
] as const;

const WEEKDAYS_MAP_REVERSE: Record<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday', string> = {
  'monday': 'segunda',
  'tuesday': 'terça',
  'wednesday': 'quarta',
  'thursday': 'quinta',
  'friday': 'sexta',
  'saturday': 'sábado',
  'sunday': 'domingo'
};

export const RoomScheduleManager: React.FC<RoomScheduleManagerProps> = ({
  schedules,
  onAddSchedule,
  onRemoveSchedule,
  onScheduleChange,
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Horários de Disponibilidade</h2>
      {schedules.map((schedule, index) => (
        <div key={index} className="grid grid-cols-4 gap-4 items-center">
          <Select 
            value={WEEKDAYS_MAP_REVERSE[schedule.weekday] || 'segunda'}
            onValueChange={(value) => 
              onScheduleChange(index, 'weekday', value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Dia da semana" />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map(day => (
                <SelectItem key={day} value={day}>
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input 
            type="time" 
            value={schedule.start_time}
            onChange={(e) => 
              onScheduleChange(index, 'start_time', e.target.value)
            }
            placeholder="Início" 
          />
          
          <Input 
            type="time" 
            value={schedule.end_time}
            onChange={(e) => 
              onScheduleChange(index, 'end_time', e.target.value)
            }
            placeholder="Término" 
          />
          
          <Button 
            type="button" 
            variant="destructive" 
            onClick={() => onRemoveSchedule(index)}
          >
            Remover
          </Button>
        </div>
      ))}
      
      <Button 
        type="button" 
        variant="secondary" 
        onClick={onAddSchedule}
      >
        Adicionar Horário
      </Button>
    </div>
  );
};