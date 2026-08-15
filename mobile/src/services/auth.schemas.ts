import { z } from 'zod';

const email = z.string()
  .trim()
  .min(1, 'El correo electrónico es obligatorio.')
  .email('Introduce un correo electrónico válido.')
  .refine((val) => val.includes('.'), 'El correo electrónico debe tener un dominio válido.')
  .toLowerCase();

const password = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar 72 caracteres.');

const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

const name = z.string()
  .trim()
  .min(1, 'El nombre es obligatorio.')
  .max(100, 'El nombre es demasiado largo.')
  .regex(namePattern, 'El nombre solo puede contener letras y espacios.');

export const loginSchema = z.object({ email, password });

export const registerSchema = z.object({ name, email, password });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const firstValidationMessage = (error: z.ZodError) => error.issues[0]?.message ?? 'Revisa los datos introducidos.';

export const validationFieldErrors = (error: z.ZodError): Record<string, string> => {
  const messages: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !messages[field]) messages[field] = issue.message;
  }
  return messages;
};