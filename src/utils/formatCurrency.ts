
/**
 * Utilitário para formatação de valores monetários
 * Converte números para formato de moeda brasileira (Real)
 */

/**
 * Formata um valor numérico para o padrão monetário brasileiro
 * @param value - Valor numérico a ser formatado
 * @returns String formatada como moeda brasileira (ex: "R$ 123,45")
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
