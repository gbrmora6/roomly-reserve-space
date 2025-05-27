
/**
 * Utilitário de logging seguro que controla exibição de logs baseado no ambiente
 * Previne que dados sensíveis sejam logados em produção
 */

// Verifica se estamos em ambiente de desenvolvimento
const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

/**
 * Registra informações apenas em ambientes de desenvolvimento
 * Use para dados que podem conter informações sensíveis
 * @param message - Mensagem a ser logada
 * @param data - Dados opcionais a serem logados (dados sensíveis devem ir aqui)
 */
export const devLog = (message: string, data?: any): void => {
  if (isDev) {
    if (data) {
      console.log(`[DEV] ${message}:`, data);
    } else {
      console.log(`[DEV] ${message}`);
    }
  }
};

/**
 * Registra erros em qualquer ambiente, mas sanitiza dados sensíveis em produção
 * @param message - Mensagem de erro a ser logada
 * @param error - Objeto de erro ou dados sensíveis
 */
export const errorLog = (message: string, error?: any): void => {
  if (isDev) {
    // Em desenvolvimento, loga todos os detalhes do erro
    console.error(`[ERROR] ${message}:`, error);
  } else {
    // Em produção, não loga detalhes potencialmente sensíveis do erro
    console.error(`[ERROR] ${message}`);
  }
};

/**
 * Registra informações em qualquer ambiente (use apenas para dados não-sensíveis)
 * @param message - Mensagem a ser logada
 * @param data - Dados não-sensíveis a serem logados
 */
export const infoLog = (message: string, data?: any): void => {
  if (data) {
    console.log(message, data);
  } else {
    console.log(message);
  }
};
