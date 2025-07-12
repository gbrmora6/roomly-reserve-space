
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
 * Cria uma data considerando o timezone brasileiro sem conversão UTC
 */
export const createBrazilDate = (dateString: string, timeString: string): Date => {
  const date = new Date(`${dateString}T${timeString}:00`);
  return date;
};

/**
 * Cria um datetime local sem conversão para UTC
 */
export const createLocalDateTime = (date: Date, timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const localDate = new Date(date);
  localDate.setHours(hours, minutes, 0, 0);
  return localDate;
};

/**
 * Formata datetime para o banco como horário local (sem timezone)
 */
export const formatDateTimeForDatabase = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

/**
 * Interpreta uma data armazenada no banco como horário local
 */
export const parseStoredDateTime = (dateTimeString: string): Date => {
  // Remove timezone info se existir e interpreta como local
  const cleanDateString = dateTimeString.replace(/[+-]\d{2}:\d{2}$|Z$/, '');
  return new Date(cleanDateString);
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

/**
 * Cria início e fim do dia para filtros de data
 */
export const createDayBounds = (date: Date) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  return {
    start: formatDateTimeForDatabase(dayStart),
    end: formatDateTimeForDatabase(dayEnd)
  };
};
