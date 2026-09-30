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

/**
 * Checks whether a given due date is strictly AFTER the project's final delivery date (data_entrega_final).
 * Returns false if either date is missing/empty, or if due date is <= final delivery date.
 * Both inputs can be ISO strings ('YYYY-MM-DD' or full ISO timestamps).
 */
export function isAfterFinalDelivery(
  dueDate?: string | null,
  dataEntregaFinal?: string | null,
): boolean {
  if (!dueDate || !dataEntregaFinal) return false
  const due = dueDate.split('T')[0]
  const final = dataEntregaFinal.split('T')[0]
  if (!due || !final) return false
  return due > final
}

// Add any other utility functions here
// Build triggered to ensure formatDateBR logic without timezone shift is applied.
// Forced production rebuild and publish to Skip Cloud to guarantee the updated formatDateBR is bundled.
// Deploy timestamp: 2026-06-20T21:30:00.000Z
