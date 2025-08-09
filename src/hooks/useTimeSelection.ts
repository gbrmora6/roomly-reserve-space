import { useState, useEffect, useMemo } from 'react';
import { generateStandardHours, calculateConsecutiveEndTimes } from '@/components/shared/TimeSelector';

export interface TimeSelectionConfig {
  // Tipo de recurso: 'room' ou 'equipment'
  resourceType: 'room' | 'equipment';
  // Horários disponíveis (vindos da API ou gerados)
  availableHours?: string[];
  // Horários de término disponíveis (para salas)
  availableEndTimes?: string[];
  // Horários bloqueados
  blockedHours?: string[];
  // Configurações para geração automática de horários
  autoGenerate?: {
    startHour: number;
    endHour: number;
  };
  // Se deve requerer horários consecutivos (para equipamentos)
  requireConsecutive?: boolean;
}

export interface TimeSelectionState {
  selectedStartTime: string | null;
  selectedEndTime: string | null;
  availableStartTimes: string[];
  availableEndTimesForSelection: string[];
  blockedHours: string[];
  isLoading: boolean;
  error: string | null;
}

export interface TimeSelectionActions {
  setSelectedStartTime: (time: string | null) => void;
  setSelectedEndTime: (time: string | null) => void;
  resetSelection: () => void;
  updateAvailableHours: (hours: string[]) => void;
  updateBlockedHours: (hours: string[]) => void;
}

export const useTimeSelection = (config: TimeSelectionConfig) => {
  const {
    resourceType,
    availableHours: providedAvailableHours,
    availableEndTimes: providedAvailableEndTimes,
    blockedHours: providedBlockedHours = [],
    autoGenerate,
    requireConsecutive = resourceType === 'equipment'
  } = config;

  // Estados principais
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [availableEndTimes, setAvailableEndTimes] = useState<string[]>([]);
  const [blockedHours, setBlockedHours] = useState<string[]>(providedBlockedHours);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gerar horários automaticamente se necessário
  useEffect(() => {
    if (autoGenerate && !providedAvailableHours) {
      const generatedHours = generateStandardHours(autoGenerate.startHour, autoGenerate.endHour);
      setAvailableHours(generatedHours);
    } else if (providedAvailableHours) {
      setAvailableHours(providedAvailableHours);
    }
  }, [providedAvailableHours, autoGenerate]);

  // Atualizar horários de término disponíveis
  useEffect(() => {
    if (providedAvailableEndTimes) {
      setAvailableEndTimes(providedAvailableEndTimes);
    }
  }, [providedAvailableEndTimes]);

  // Atualizar horários bloqueados
  useEffect(() => {
    setBlockedHours(providedBlockedHours);
  }, [providedBlockedHours]);

  // Calcular horários de início disponíveis (removendo bloqueados)
  const availableStartTimes = useMemo(() => {
    return availableHours.filter(hour => !blockedHours.includes(hour));
  }, [availableHours, blockedHours]);

  // Calcular horários de término disponíveis para seleção
  const availableEndTimesForSelection = useMemo(() => {
    if (!selectedStartTime) return [];

    if (requireConsecutive) {
      // Para equipamentos: calcular horários consecutivos
      return calculateConsecutiveEndTimes(availableHours, selectedStartTime, blockedHours);
    } else {
      // Para salas: usar horários de término fornecidos
      const startHourNum = parseInt(selectedStartTime.split(':')[0]);
      return availableEndTimes.filter(hour => {
        const hourNum = parseInt(hour.split(':')[0]);
        return hourNum > startHourNum && !blockedHours.includes(hour);
      }).sort((a, b) => {
        const hourA = parseInt(a.split(':')[0]);
        const hourB = parseInt(b.split(':')[0]);
        return hourA - hourB;
      });
    }
  }, [selectedStartTime, availableHours, availableEndTimes, blockedHours, requireConsecutive]);

  // Resetar horário de término quando horário de início muda
  useEffect(() => {
    if (selectedStartTime && selectedEndTime) {
      const startHourNum = parseInt(selectedStartTime.split(':')[0]);
      const endHourNum = parseInt(selectedEndTime.split(':')[0]);
      
      // Se o horário de término não é mais válido, resetar
      if (endHourNum <= startHourNum || !availableEndTimesForSelection.includes(selectedEndTime)) {
        setSelectedEndTime(null);
      }
    }
  }, [selectedStartTime, availableEndTimesForSelection, selectedEndTime]);

  // Ações
  const actions: TimeSelectionActions = {
    setSelectedStartTime: (time: string | null) => {
      setSelectedStartTime(time);
      if (!time) {
        setSelectedEndTime(null);
      }
    },
    
    setSelectedEndTime: (time: string | null) => {
      setSelectedEndTime(time);
    },
    
    resetSelection: () => {
      setSelectedStartTime(null);
      setSelectedEndTime(null);
      setError(null);
    },
    
    updateAvailableHours: (hours: string[]) => {
      setAvailableHours(hours);
    },
    
    updateBlockedHours: (hours: string[]) => {
      setBlockedHours(hours);
    }
  };

  // Estado consolidado
  const state: TimeSelectionState = {
    selectedStartTime,
    selectedEndTime,
    availableStartTimes,
    availableEndTimesForSelection,
    blockedHours,
    isLoading,
    error
  };

  return {
    ...state,
    ...actions,
    // Propriedades computadas úteis
    hasValidSelection: selectedStartTime !== null && selectedEndTime !== null,
    duration: selectedStartTime && selectedEndTime ? 
      parseInt(selectedEndTime.split(':')[0]) - parseInt(selectedStartTime.split(':')[0]) : 0,
    // Configuração para o TimeSelector
    timeSelectorProps: {
      availableHours: availableStartTimes,
      availableEndTimes: availableEndTimesForSelection,
      blockedHours,
      selectedStartTime,
      selectedEndTime,
      onSelectStartTime: actions.setSelectedStartTime,
      onSelectEndTime: actions.setSelectedEndTime,
      requireConsecutive
    }
  };
};

export default useTimeSelection;