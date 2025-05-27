
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utilitário para combinar classes CSS de forma inteligente
 * Merge classes do Tailwind CSS evitando conflitos e duplicações
 * 
 * @param inputs - Array de valores de classe (strings, objetos condicionais, etc)
 * @returns String com classes combinadas e otimizadas
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
