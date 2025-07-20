import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database } from "@/integrations/supabase/types";

type Weekday = Database["public"]["Enums"]["weekday"];

interface DayFilterProps {
  selectedDay: Weekday | "all";
  onDayChange: (day: Weekday | "all") => void;
}

const weekdayLabels: Record<Weekday, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

const weekdays: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function DayFilter({ selectedDay, onDayChange }: DayFilterProps) {
  return (
    <Select value={selectedDay} onValueChange={onDayChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Selecione o dia" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os dias</SelectItem>
        {weekdays.map((day) => (
          <SelectItem key={day} value={day}>
            {weekdayLabels[day]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}