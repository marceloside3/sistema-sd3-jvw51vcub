/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const datePart = dateStr.split('T')[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return dateStr
  const [year, month, day] = datePart.split('-')
  return `${day}/${month}/${year}`
}

// Add any other utility functions here
// Build triggered to ensure formatDateBR logic without timezone shift is applied.
// Forced production rebuild and publish to Skip Cloud to guarantee the updated formatDateBR is bundled.
