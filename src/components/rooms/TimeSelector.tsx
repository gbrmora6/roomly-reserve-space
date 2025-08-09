import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeSelectorProps {
  availableHours: string[];
  availableEndTimes: string[];
  blockedHours: string[];
  selectedStartTime: string | null;
  selectedEndTime: string | null;
  onSelectStartTime: (time: string | null) => void;
  onSelectEndTime: (time: string | null) => void;
}

// Legacy interface for backward compatibility
interface LegacyTimeSelectorProps {
  hours: string[];
  blockedHours?: string[];
  selectedHour: string | null;
  onSelectHour: (hour: string) => void;
  isEndTime?: boolean;
  startHour?: string;
}

// Type guard to check if props are legacy
function isLegacyProps(props: TimeSelectorProps | LegacyTimeSelectorProps): props is LegacyTimeSelectorProps {
  return 'hours' in props;
}

export const TimeSelector: React.FC<TimeSelectorProps | LegacyTimeSelectorProps> = (props) => {
  // Handle legacy props for backward compatibility
  if (isLegacyProps(props)) {
    const { hours, blockedHours, selectedHour, onSelectHour, isEndTime, startHour } = props;
    
    // Safety check for undefined arrays
    if (!hours || !Array.isArray(hours)) {
      return <div className="text-muted-foreground">Nenhum horário disponível</div>;
    }
    
    if (isEndTime && startHour) {
      // This is equivalent to the end time selector with a selected start time
      const startIndex = hours.indexOf(startHour);
      const availableEndTimes: string[] = [];
      
      // Calculate all possible end times based on consecutive available hours from start time
      const startHourNum = parseInt(startHour.split(':')[0]);
      
      // Check each possible end time starting from the hour after start time
      for (let endHourNum = startHourNum + 1; endHourNum <= 24; endHourNum++) {
        const endTimeStr = `${endHourNum.toString().padStart(2, '0')}:00`;
        
        // Check if all hours between start and end are available
        let allConsecutiveAvailable = true;
        for (let checkHour = startHourNum; checkHour < endHourNum; checkHour++) {
          const checkTimeStr = `${checkHour.toString().padStart(2, '0')}:00`;
          if (!hours.includes(checkTimeStr) || blockedHours?.includes(checkTimeStr)) {
            allConsecutiveAvailable = false;
            break;
          }
        }
        
        if (allConsecutiveAvailable) {
          availableEndTimes.push(endTimeStr);
        } else {
          // If we hit an unavailable hour, stop looking further
          break;
        }
      }
      
      return (
        <div className="space-y-2">
          <p className="text-sm mb-2">Selecione o horário de término:</p>
          <div className="grid grid-cols-3 gap-2">
            {availableEndTimes.map((hour) => {
              const isBlocked = blockedHours?.includes(hour);
              
              return (
                <Button
                  key={hour}
                  variant={selectedHour === hour ? "default" : "outline"}
                  onClick={() => {
                    if (!isBlocked) {
                      onSelectHour(hour);
                    }
                  }}
                  disabled={isBlocked}
                  className={isBlocked ? "bg-red-500 hover:bg-red-600 text-white cursor-not-allowed" : ""}
                >
                  {hour}
                </Button>
              );
            })}
          </div>
          {availableEndTimes.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum horário consecutivo disponível</p>
          )}
        </div>
      );
    }
    
    // This is equivalent to the start time selector
    return (
      <div className="space-y-2">
        <p className="text-sm mb-2">Selecione o horário de início:</p>
        <div className="grid grid-cols-3 gap-2">
          {hours.map((hour, index) => {
            const isBlocked = blockedHours?.includes(hour);
            const isDisabled = isBlocked;
            
            return (
              <Button
                key={hour}
                variant={selectedHour === hour ? "default" : "outline"}
                onClick={() => {
                  if (!isDisabled) {
                    onSelectHour(hour);
                  }
                }}
                disabled={isDisabled}
                className={isDisabled ? "bg-red-500 hover:bg-red-600 text-white cursor-not-allowed" : ""}
              >
                {hour}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  // Main implementation using separated start and end times
  const { availableHours, availableEndTimes, blockedHours, selectedStartTime, selectedEndTime, onSelectStartTime, onSelectEndTime } = props;
  
  // Safety checks for undefined arrays
  if (!availableHours || !Array.isArray(availableHours)) {
    return <div className="text-muted-foreground">Nenhum horário disponível</div>;
  }
  
  // Ensure blockedHours is an array
  const safeBlockedHours = blockedHours || [];
  
  // If we have selected a start time, show available end times
  if (selectedStartTime) {
    if (!availableEndTimes || !Array.isArray(availableEndTimes)) {
      return <div className="text-muted-foreground">Nenhum horário de término disponível</div>;
    }
    
    // Safety check for selectedStartTime
    if (!selectedStartTime || typeof selectedStartTime !== 'string') {
      return <div className="text-muted-foreground">Horário de início inválido</div>;
    }
    
    const startHourNum = parseInt(selectedStartTime.split(':')[0]);
    const filteredEndTimes: string[] = [];
    
    // Use the dedicated end times that include final hours like 12:00 and 18:00
    availableEndTimes.forEach((hour: string) => {
      // Safety check for hour
      if (!hour || typeof hour !== 'string') {
        return;
      }
      const hourNum = parseInt(hour.split(':')[0]);
      if (hourNum > startHourNum && !safeBlockedHours.includes(hour)) {
        filteredEndTimes.push(hour);
      }
    });
    
    // Sort the available end times
    filteredEndTimes.sort((a, b) => {
      // Safety check for sorting
      if (!a || !b || typeof a !== 'string' || typeof b !== 'string') {
        return 0;
      }
      const hourA = parseInt(a.split(':')[0]);
      const hourB = parseInt(b.split(':')[0]);
      return hourA - hourB;
    });
    
    return (
      <div className="space-y-2">
        <p className="font-medium text-sm">Horário de início selecionado: <span className="font-bold">{selectedStartTime}</span></p>
        <p className="text-sm mb-2">Selecione o horário de término:</p>
        
        <div className="grid grid-cols-3 gap-2">
          {filteredEndTimes.map((hour) => {
          const isBlocked = safeBlockedHours.includes(hour);
            
            return (
              <Button
                key={hour}
                variant={selectedEndTime === hour ? "default" : "outline"}
                onClick={() => {
                  if (!isBlocked) {
                    onSelectEndTime(hour);
                  }
                }}
                disabled={isBlocked}
                className={isBlocked ? "bg-red-500 hover:bg-red-600 text-white cursor-not-allowed" : ""}
              >
                {hour}
              </Button>
            );
          })}
        </div>
        {filteredEndTimes.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum horário consecutivo disponível</p>
        )}
      </div>
    );
  }
  
  // Otherwise show available start times
  return (
    <div className="space-y-2">
      <p className="text-sm mb-2">Selecione o horário de início:</p>
      <div className="grid grid-cols-3 gap-2">
        {availableHours.map((hour, index) => {
          const isBlocked = safeBlockedHours.includes(hour);
          const isDisabled = isBlocked;
          
          return (
            <Button
              key={hour}
              variant={selectedStartTime === hour ? "default" : "outline"}
              onClick={() => {
                if (!isDisabled) {
                  onSelectStartTime(hour);
                }
              }}
              disabled={isDisabled}
              className={isDisabled ? "bg-red-500 hover:bg-red-600 text-white cursor-not-allowed" : ""}
            >
              {hour}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

// Export as UnifiedTimeSelector for easier migration
export { TimeSelector as UnifiedTimeSelector };
