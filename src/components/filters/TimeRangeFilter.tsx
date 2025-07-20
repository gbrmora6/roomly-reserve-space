import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface TimeRangeFilterProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

export const TimeRangeFilter = ({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
}: TimeRangeFilterProps) => {
  // Gera opções de horário de 6:00 às 23:00
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour <= 23; hour++) {
      const timeString = `${hour.toString().padStart(2, "0")}:00`;
      options.push(timeString);
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Filtra horários de fim baseado no horário de início
  const getEndTimeOptions = () => {
    if (!startTime || startTime === "all") return timeOptions;
    
    const startHour = parseInt(startTime.split(":")[0]);
    return timeOptions.filter(time => {
      const hour = parseInt(time.split(":")[0]);
      return hour > startHour;
    });
  };

  // Reset endTime quando startTime for "all"
  const handleStartTimeChange = (time: string) => {
    onStartTimeChange(time);
    if (time === "all") {
      onEndTimeChange("all");
    }
  };

  return (
    <div className="flex gap-4 items-end">
      <div className="flex flex-col gap-2">
        <Label htmlFor="start-time">Horário de Início</Label>
        <Select value={startTime} onValueChange={handleStartTimeChange}>
          <SelectTrigger className="w-[140px]" id="start-time">
            <SelectValue placeholder="Início" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer horário</SelectItem>
            {timeOptions.map((time) => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="end-time">Horário de Fim</Label>
        <Select 
          value={endTime} 
          onValueChange={onEndTimeChange}
          disabled={!startTime || startTime === "all"}
        >
          <SelectTrigger className="w-[140px]" id="end-time">
            <SelectValue placeholder="Fim" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer horário</SelectItem>
            {getEndTimeOptions().map((time) => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};