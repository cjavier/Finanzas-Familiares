import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Translates common error messages to Spanish for better user experience
 */
export function translateErrorMessage(message: string): string {
  const errorTranslations: Record<string, string> = {
    'Email already exists': 'Este correo electrónico ya está registrado. Por favor, usa otro correo o inicia sesión.',
    'User not found': 'Usuario no encontrado',
    'Invalid credentials': 'Credenciales inválidas',
    'Invalid invite code': 'Código de invitación inválido',
    'Team not found': 'Equipo no encontrado',
    'Unauthorized': 'No autorizado',
    'Forbidden': 'Acceso denegado',
    'Not found': 'No encontrado',
    'Internal server error': 'Error interno del servidor',
    'Bad request': 'Solicitud incorrecta',
    'Validation failed': 'Error de validación',
    'Password too short': 'La contraseña es demasiado corta',
    'Password must contain': 'La contraseña debe contener',
    'Invalid email format': 'Formato de correo electrónico inválido',
    'Name is required': 'El nombre es requerido',
    'Email is required': 'El correo electrónico es requerido',
    'Password is required': 'La contraseña es requerida',
    'Team name is required': 'El nombre del equipo es requerido',
    'Invite code is required': 'El código de invitación es requerido',
  };

  // Try to find an exact match first
  if (errorTranslations[message]) {
    return errorTranslations[message];
  }

  // Try to find partial matches for more dynamic error messages
  for (const [key, translation] of Object.entries(errorTranslations)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return translation;
    }
  }

  // If no translation found, return the original message
  return message;
}

// Date utilities (timezone-safe for YYYY-MM-DD values)
export function getLocalDateYMD(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseYmdToLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((v) => parseInt(v, 10));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

export function formatYmdForDisplay(ymd: string, locale?: string): string {
  if (!ymd) return '';
  const date = parseYmdToLocalDate(ymd);
  if (isNaN(date.getTime())) return ymd;
  return date.toLocaleDateString(locale || undefined);
}
