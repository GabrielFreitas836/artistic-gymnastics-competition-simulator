import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  // Junta classes condicionais e resolve conflitos do Tailwind no mesmo passo.
  return twMerge(clsx(inputs))
}
