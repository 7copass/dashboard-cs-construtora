import { format, parseISO } from "date-fns";

/**
 * Format a number as BRL currency (R$ 1.234,56)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Format a date string or Date object as dd/MM/yyyy
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy");
}

/**
 * Format a number as percentage (e.g. 75,5%)
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals).replace(".", ",")}%`;
}

/**
 * Format a number as compact BRL currency (R$ 1,2M / R$ 500K)
 */
export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}R$ ${(abs / 1_000_000_000).toFixed(1).replace(".", ",")}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${(abs / 1_000).toFixed(0).replace(".", ",")}K`;
  }
  return formatCurrency(value);
}
