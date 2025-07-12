/**
 * Utilitários para manipulação de timezone
 * Timezone padrão: America/Sao_Paulo (UTC-3)
 */

export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte horário local para o formato correto do banco (considerando timezone brasileiro)
 */
export const formatTimeForDatabase = (time: string): string => {
  if (!time) return time;
  
  // Se o time já está no formato HH:MM, retorna como está
  if (time.match(/^\d{2}:\d{2}$/)) {
    return time;
  }
  
  return time;
};

/**
 * Converte horário do banco para exibição local
 */
export const formatTimeForDisplay = (time: string | null): string => {
  if (!time) return '';
  
  // Se já está no formato HH:MM, retorna como está
  if (time.match(/^\d{2}:\d{2}$/)) {
    return time;
  }
  
  // Se tem timezone info, converte para local
  try {
    const date = new Date(`1970-01-01T${time}`);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return time;
  }
};

/**
 * Cria uma data considerando o timezone brasileiro
 */
export const createBrazilDate = (dateString: string, timeString: string): Date => {
  const date = new Date(`${dateString}T${timeString}:00`);
  return date;
};

/**
 * Formata uma data para o timezone brasileiro
 */
export const formatBrazilDateTime = (date: Date): string => {
  return date.toLocaleString('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};