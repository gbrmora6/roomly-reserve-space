import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeSelectorProps {
  availableHours: string[];
  blockedHours: string[];
  selectedStartTime: string | null;
  selectedEndTime: string | null;
  onSelectStartTime: (time: string) => void;
  onSelectEndTime: (time: string) => void;
}

// Backwards compatibility props for components that haven't been updated yet
interface LegacyTimeSelectorProps {
  hours: string[];
  blockedHours: any[];
  selectedHour: string;
  onSelectHour: (hour: string) => void;
  isEndTime?: boolean;
  startHour?: string;
}

// Type guard to check which prop interface is being used
const isLegacyProps = (props: TimeSelectorProps | LegacyTimeSelectorProps): props is LegacyTimeSelectorProps => {
  return 'hours' in props;
};

export const TimeSelector: React.FC<TimeSelectorProps | LegacyTimeSelectorProps> = (props) => {
  // Handle legacy props for backward compatibility
  if (isLegacyProps(props)) {
    const { hours, blockedHours, selectedHour, onSelectHour, isEndTime, startHour } = props;
    
    if (isEndTime && startHour) {
      // This is equivalent to the end time selector with a selected start time
      const availableEndTimes = hours.filter(time => time > startHour);
      
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
  
  // Original implementation with new props
  const { availableHours, blockedHours, selectedStartTime, selectedEndTime, onSelectStartTime, onSelectEndTime } = props;
  
  // If we have selected a start time, show available end times
  if (selectedStartTime) {
    // Find consecutive available hours starting from the selected start time
    const startIndex = availableHours.indexOf(selectedStartTime);
    const availableEndTimes: string[] = [];
    
    // Add consecutive available hours as possible end times
    for (let i = startIndex + 1; i < availableHours.length; i++) {
      const currentHour = availableHours[i];
      const prevHour = availableHours[i - 1];
      
      // Check if current hour is consecutive to previous hour
      const currentHourNum = parseInt(currentHour.split(':')[0]);
      const prevHourNum = parseInt(prevHour.split(':')[0]);
      
      if (currentHourNum === prevHourNum + 1 && !blockedHours.includes(currentHour)) {
        availableEndTimes.push(currentHour);
      } else if (blockedHours.includes(currentHour)) {
        // Stop if we hit a blocked hour
        break;
      } else if (currentHourNum !== prevHourNum + 1) {
        // Stop if hours are not consecutive
        break;
      }
    }
    
    // Always allow at least the next hour if available
    if (availableEndTimes.length === 0) {
      const nextHourIndex = startIndex + 1;
      if (nextHourIndex < availableHours.length && !blockedHours.includes(availableHours[nextHourIndex])) {
        availableEndTimes.push(availableHours[nextHourIndex]);
      }
    }
    
    return (
      <div className="space-y-2">
        <p className="font-medium text-sm">Horário de início selecionado: <span className="font-bold">{selectedStartTime}</span></p>
        <p className="text-sm mb-2">Selecione o horário de término:</p>
        
        <div className="grid grid-cols-3 gap-2">
          {availableEndTimes.map((hour) => {
            const isBlocked = blockedHours.includes(hour);
            
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
      </div>
    );
  }
  
  // Otherwise show available start times
  return (
    <div className="space-y-2">
      <p className="text-sm mb-2">Selecione o horário de início:</p>
      <div className="grid grid-cols-3 gap-2">
        {availableHours.map((hour, index) => {
          const isBlocked = blockedHours.includes(hour);
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
