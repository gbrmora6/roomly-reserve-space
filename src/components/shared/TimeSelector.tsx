import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Interface unificada para o TimeSelector
export interface TimeSelectorProps {
  // Horários disponíveis para início
  availableHours: string[];
  // Horários disponíveis para término (opcional, usado quando há horário de início selecionado)
  availableEndTimes?: string[];
  // Horários bloqueados
  blockedHours?: string[];
  // Horário de início selecionado
  selectedStartTime?: string | null;
  // Horário de término selecionado
  selectedEndTime?: string | null;
  // Callback para seleção de horário de início
  onSelectStartTime: (time: string | null) => void;
  // Callback para seleção de horário de término
  onSelectEndTime?: (time: string | null) => void;
  // Modo do seletor: 'start' para início, 'end' para término, 'both' para ambos
  mode?: 'start' | 'end' | 'both';
  // Título customizado (opcional)
  title?: string;
  // Classe CSS adicional
  className?: string;
  // Se deve mostrar horários consecutivos apenas (para equipamentos)
  requireConsecutive?: boolean;
}

// Interface legacy para compatibilidade com código existente
export interface LegacyTimeSelectorProps {
  hours: string[];
  blockedHours?: string[];
  selectedHour: string | null;
  onSelectHour: (hour: string) => void;
  isEndTime?: boolean;
  startHour?: string;
}

// Type guard para verificar se são props legacy
function isLegacyProps(props: TimeSelectorProps | LegacyTimeSelectorProps): props is LegacyTimeSelectorProps {
  return 'hours' in props && 'onSelectHour' in props;
}

// Função utilitária para gerar horários padrão
export const generateStandardHours = (startHour: number = 6, endHour: number = 23): string[] => {
  const hours: string[] = [];
  for (let i = startHour; i <= endHour; i++) {
    hours.push(`${i.toString().padStart(2, '0')}:00`);
  }
  return hours;
};

// Função utilitária para calcular horários consecutivos
export const calculateConsecutiveEndTimes = (
  availableHours: string[],
  startTime: string,
  blockedHours: string[] = [],
  maxEndHour: number = 24
): string[] => {
  const startHourNum = parseInt(startTime.split(':')[0]);
  const availableEndTimes: string[] = [];
  
  // Verifica cada possível horário de término a partir da hora seguinte ao início
  for (let endHourNum = startHourNum + 1; endHourNum <= maxEndHour; endHourNum++) {
    const endTimeStr = `${endHourNum.toString().padStart(2, '0')}:00`;
    
    // Verifica se todas as horas entre início e fim estão disponíveis
    let allConsecutiveAvailable = true;
    for (let checkHour = startHourNum; checkHour < endHourNum; checkHour++) {
      const checkTimeStr = `${checkHour.toString().padStart(2, '0')}:00`;
      if (!availableHours.includes(checkTimeStr) || blockedHours.includes(checkTimeStr)) {
        allConsecutiveAvailable = false;
        break;
      }
    }
    
    if (allConsecutiveAvailable) {
      availableEndTimes.push(endTimeStr);
    } else {
      // Se encontrou uma hora indisponível, para de procurar
      break;
    }
  }
  
  return availableEndTimes;
};

export const TimeSelector: React.FC<TimeSelectorProps | LegacyTimeSelectorProps> = (props) => {
  // Compatibilidade com props legacy
  if (isLegacyProps(props)) {
    const { hours, blockedHours = [], selectedHour, onSelectHour, isEndTime, startHour } = props;
    
    if (!hours || !Array.isArray(hours)) {
      return <div className="text-muted-foreground">Nenhum horário disponível</div>;
    }
    
    if (isEndTime && startHour) {
      const availableEndTimes = calculateConsecutiveEndTimes(hours, startHour, blockedHours);
      
      return (
        <div className="space-y-2">
          <p className="text-sm mb-2">Selecione o horário de término:</p>
          <div className="grid grid-cols-3 gap-2">
            {availableEndTimes.map((hour) => {
              const isBlocked = blockedHours.includes(hour);
              
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
    
    return (
      <div className="space-y-2">
        <p className="text-sm mb-2">Selecione o horário de início:</p>
        <div className="grid grid-cols-3 gap-2">
          {hours.map((hour) => {
            const isBlocked = blockedHours.includes(hour);
            
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

  // Implementação principal com interface unificada
  const {
    availableHours,
    availableEndTimes,
    blockedHours = [],
    selectedStartTime,
    selectedEndTime,
    onSelectStartTime,
    onSelectEndTime,
    mode = 'both',
    title,
    className,
    requireConsecutive = false
  } = props;
  
  if (!availableHours || !Array.isArray(availableHours)) {
    return <div className="text-muted-foreground">Nenhum horário disponível</div>;
  }
  
  // Renderização do seletor de horário de término
  const renderEndTimeSelector = () => {
    if (!selectedStartTime || !onSelectEndTime) return null;
    
    let endTimes: string[] = [];
    
    if (requireConsecutive) {
      // Para equipamentos: calcular horários consecutivos
      endTimes = calculateConsecutiveEndTimes(availableHours, selectedStartTime, blockedHours);
    } else {
      // Para salas: usar availableEndTimes fornecidos
      if (availableEndTimes && Array.isArray(availableEndTimes)) {
        const startHourNum = parseInt(selectedStartTime.split(':')[0]);
        endTimes = availableEndTimes.filter(hour => {
          const hourNum = parseInt(hour.split(':')[0]);
          return hourNum > startHourNum && !blockedHours.includes(hour);
        });
      }
    }
    
    // Ordenar horários de término
    endTimes.sort((a, b) => {
      const hourA = parseInt(a.split(':')[0]);
      const hourB = parseInt(b.split(':')[0]);
      return hourA - hourB;
    });
    
    return (
      <div className="space-y-2">
        <p className="font-medium text-sm">
          Horário de início selecionado: <span className="font-bold">{selectedStartTime}</span>
        </p>
        <p className="text-sm mb-2">{title || 'Selecione o horário de término:'}:</p>
        
        <div className="grid grid-cols-3 gap-2">
          {endTimes.map((hour) => {
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
                className={cn(
                  isBlocked && "bg-red-500 hover:bg-red-600 text-white cursor-not-allowed"
                )}
              >
                {hour}
              </Button>
            );
          })}
        </div>
        {endTimes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {requireConsecutive ? 'Nenhum horário consecutivo disponível' : 'Nenhum horário de término disponível'}
          </p>
        )}
      </div>
    );
  };
  
  // Renderização do seletor de horário de início
  const renderStartTimeSelector = () => {
    return (
      <div className="space-y-2">
        <p className="text-sm mb-2">{title || 'Selecione o horário de início:'}:</p>
        <div className="grid grid-cols-3 gap-2">
          {availableHours.map((hour) => {
            const isBlocked = blockedHours.includes(hour);
            
            return (
              <Button
                key={hour}
                variant={selectedStartTime === hour ? "default" : "outline"}
                onClick={() => {
                  if (!isBlocked) {
                    onSelectStartTime(hour);
                  }
                }}
                disabled={isBlocked}
                className={cn(
                  isBlocked && "bg-red-500 hover:bg-red-600 text-white cursor-not-allowed"
                )}
              >
                {hour}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Renderização baseada no modo
  return (
    <div className={cn("space-y-4", className)}>
      {(mode === 'start' || mode === 'both') && renderStartTimeSelector()}
      {(mode === 'end' || (mode === 'both' && selectedStartTime)) && renderEndTimeSelector()}
    </div>
  );
};

export default TimeSelector;