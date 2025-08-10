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
  // Intervalo mínimo em minutos (padrão: 60 minutos)
  minimumIntervalMinutes?: number;
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
  maxEndHour: number = 24,
  minimumIntervalMinutes: number = 60
): string[] => {
  // Normaliza uma string de hora para o formato HH:00
  const normalize = (time: string) => {
    const hourNum = parseInt(time.split(':')[0]);
    return `${hourNum.toString().padStart(2, '0')}:00`;
  };

  // Normaliza listas de horários para evitar mismatch entre '8:00' e '08:00'
  const normalizedAvailable = new Set(availableHours.map(normalize));
  const normalizedBlocked = new Set(blockedHours.map(normalize));
  const normalizedStart = normalize(startTime);
  const startHourNum = parseInt(normalizedStart.split(':')[0]);
  const availableEndTimes: string[] = [];
  
  // Calcular o mínimo de horas baseado no intervalo mínimo
  const minimumHours = Math.ceil(minimumIntervalMinutes / 60);
  const minEndHour = startHourNum + minimumHours;
  
  // Verifica cada possível horário de término a partir do mínimo necessário
  for (let endHourNum = minEndHour; endHourNum <= maxEndHour; endHourNum++) {
    const endTimeStr = `${endHourNum.toString().padStart(2, '0')}:00`;
    
    // Verifica se todas as horas entre início e fim estão disponíveis
    let allConsecutiveAvailable = true;
    for (let checkHour = startHourNum; checkHour < endHourNum; checkHour++) {
      const checkTimeStr = `${checkHour.toString().padStart(2, '0')}:00`;
      const isAvailable = normalizedAvailable.has(checkTimeStr);
      const isBlocked = normalizedBlocked.has(checkTimeStr);
      
      if (!isAvailable || isBlocked) {
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

// Função para calcular horários de término respeitando intervalo mínimo para salas
export const calculateMinimumIntervalEndTimes = (
  availableEndTimes: string[],
  startTime: string,
  minimumIntervalMinutes: number = 60
): string[] => {
  const startHourNum = parseInt(startTime.split(':')[0]);
  const minimumHours = Math.ceil(minimumIntervalMinutes / 60);
  const minEndHour = startHourNum + minimumHours;
  
  return availableEndTimes.filter(endTime => {
    const endHourNum = parseInt(endTime.split(':')[0]);
    return endHourNum >= minEndHour;
  });
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
    requireConsecutive = false,
    minimumIntervalMinutes = 60
  } = props;
  
  if (!availableHours || !Array.isArray(availableHours)) {
    return <div className="text-muted-foreground">Nenhum horário disponível</div>;
  }
  
  // Renderização do seletor de horário de término
  const renderEndTimeSelector = () => {
    if (!selectedStartTime || !onSelectEndTime) return null;
    
    let endTimes: string[] = [];
    
    if (requireConsecutive) {
      // Para equipamentos: calcular horários consecutivos respeitando intervalo mínimo
      endTimes = calculateConsecutiveEndTimes(
        availableHours, 
        selectedStartTime, 
        blockedHours, 
        24, 
        minimumIntervalMinutes
      );
    } else {
      // Para salas: usar availableEndTimes fornecidos e aplicar intervalo mínimo
      if (availableEndTimes && Array.isArray(availableEndTimes)) {
        const filteredByMinimum = calculateMinimumIntervalEndTimes(
          availableEndTimes,
          selectedStartTime,
          minimumIntervalMinutes
        );
        endTimes = filteredByMinimum.filter(hour => !blockedHours.includes(hour));
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