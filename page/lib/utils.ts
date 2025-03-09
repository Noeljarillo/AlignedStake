import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats token amounts, truncating to N.NM for millions
 * Examples: 1500000 -> 1.5M, 5200000 -> 5.2M
 * For smaller numbers, formats with appropriate precision
 */
export function formatTokenAmount(amount: number | string): string {
  // Convert string to number if needed
  const num = typeof amount === 'string' ? Number(amount) : amount;
  
  if (isNaN(num)) return '0';
  
  if (num >= 1_000_000) {
    // For millions, format as N.NM (truncate to one decimal place)
    const millions = num / 1_000_000;
    return `${Math.floor(millions * 10) / 10}M`;
  }
  
  if (num >= 1_000) {
    // For thousands, use 2 decimal places with K suffix
    return `${(num / 1_000).toFixed(2)}K`;
  }
  
  // For small numbers, use 2 decimal places
  return num.toFixed(2);
}
