import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…'
}

/**
 * Generates 2-character initials from an agent/skill name.
 * - Multi-word (split by space / hyphen / underscore / dot):
 *     first letter of first word + first letter of last word
 *     e.g. "council-mc" → "CM", "council-devils-advocate" → "CA"
 * - Single word ≥ 2 chars: first 2 characters
 *     e.g. "claude" → "CL"
 * - Single char: repeated
 *     e.g. "a" → "AA"
 */
export function getInitials(name: string): string {
  const words = name.split(/[\s\-_\.]+/).filter(Boolean)
  if (words.length === 0) return '??'
  if (words.length === 1) {
    const w = words[0].toUpperCase()
    return w.length >= 2 ? w.slice(0, 2) : w + w
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}