import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface EquipmentTimeRangeFilterProps {
  startTime: string | null;
  endTime: string | null;
  onStartTimeChange: (time: string | null) => void;
  onEndTimeChange: (time: string | null) => void;
  availableHours?: string[];
  className?: string;
}

// Gera horários padrão de 6:00 às 23:00
const generateDefaultHours = (): string[] => {
  const hours = [];
  for (let i = 6; i <= 23; i++) {
    hours.push(`${i.toString().padStart(2, '0')}:00`);
  }
  return hours;
};

// Filtra horários de término baseado no horário de início
const getAvailableEndTimes = (startTime: string | null, allHours: string[]): string[] => {
  if (!startTime || startTime === 'all') return [];
  
  const startIndex = allHours.indexOf(startTime);
  if (startIndex === -1) return [];
  
  // Retorna horários após o horário de início
  return allHours.slice(startIndex + 1);
};

export const EquipmentTimeRangeFilter: React.FC<EquipmentTimeRangeFilterProps> = ({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  availableHours,
  className = '',
}) => {
  const hours = availableHours || generateDefaultHours();
  const availableEndTimes = getAvailableEndTimes(startTime, hours);

  const handleStartTimeChange = (value: string) => {
    const newStartTime = value === 'all' ? null : value;
    onStartTimeChange(newStartTime);
    
    // Reset end time se start time for "all" ou se end time não for mais válido
    if (value === 'all') {
      onEndTimeChange(null);
    } else if (endTime) {
      const newAvailableEndTimes = getAvailableEndTimes(newStartTime, hours);
      if (!newAvailableEndTimes.includes(endTime)) {
        onEndTimeChange(null);
      }
    }
  };

  const handleEndTimeChange = (value: string) => {
    const newEndTime = value === 'all' ? null : value;
    onEndTimeChange(newEndTime);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="start-time">Horário de início</Label>
        <Select value={startTime || 'all'} onValueChange={handleStartTimeChange}>
          <SelectTrigger id="start-time">
            <SelectValue placeholder="Selecione o horário de início" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer horário</SelectItem>
            {hours.map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="end-time">Horário de término</Label>
        <Select 
          value={endTime || 'all'} 
          onValueChange={handleEndTimeChange}
          disabled={!startTime || startTime === 'all'}
        >
          <SelectTrigger id="end-time">
            <SelectValue placeholder="Selecione o horário de término" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer horário</SelectItem>
            {availableEndTimes.map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};