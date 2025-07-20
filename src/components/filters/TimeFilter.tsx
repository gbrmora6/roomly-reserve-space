import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimeFilterProps {
  selectedTime: string;
  onTimeChange: (time: string) => void;
}

// Gera horários de 6:00 às 23:00 de hora em hora
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 6; hour <= 23; hour++) {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    times.push(timeString);
  }
  return times;
};

const timeOptions = generateTimeOptions();

export function TimeFilter({ selectedTime, onTimeChange }: TimeFilterProps) {
  return (
    <Select value={selectedTime} onValueChange={onTimeChange}>
      <SelectTrigger className="w-[150px]">
        <SelectValue placeholder="Horário" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os horários</SelectItem>
        {timeOptions.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}