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
