
/**
 * Secure logger utility that conditionally displays logs based on environment
 * Prevents sensitive data from being logged in production
 */

// Check if we're in development mode
const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

/**
 * Log information only in development environments
 * @param message - Message to log
 * @param data - Optional data to log (sensitive data should go here)
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
 * Log errors in any environment, but sanitize sensitive data in production
 * @param message - Error message to log
 * @param error - Error object or sensitive data
 */
export const errorLog = (message: string, error?: any): void => {
  if (isDev) {
    console.error(`[ERROR] ${message}:`, error);
  } else {
    // In production, don't log potentially sensitive error details
    console.error(`[ERROR] ${message}`);
  }
};

/**
 * Log information in any environment (use for non-sensitive data only)
 * @param message - Message to log
 * @param data - Non-sensitive data to log
 */
export const infoLog = (message: string, data?: any): void => {
  if (data) {
    console.log(message, data);
  } else {
    console.log(message);
  }
};
