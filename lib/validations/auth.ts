import { z } from 'zod';

const WEAK_PINS = [
  '123456', '654321', '000000', '111111', '222222', '333333',
  '444444', '555555', '666666', '777777', '888888', '999999',
  '112233', '121212', '123123', '012345', '987654',
];

const isSequential = (p: string): boolean =>
  '0123456789'.includes(p) || '9876543210'.includes(p);

export const pinSchema = z
  .string()
  .regex(/^\d{6}$/, 'El PIN debe ser de 6 dígitos')
  .refine((pin) => !WEAK_PINS.includes(pin), 'El PIN es demasiado débil')
  .refine((pin) => !isSequential(pin), 'El PIN no puede ser una secuencia');

export const emailSchema = z
  .string()
  .email('Ingresa un email válido')
  .min(1, 'El email es requerido');

export const registerSchema = z.object({
  email: emailSchema,
  displayName: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(60, 'Máximo 60 caracteres'),
  pin: pinSchema,
  confirmPin: z.string().regex(/^\d{6}$/, 'Confirma tu PIN'),
}).refine((data) => data.pin === data.confirmPin, {
  message: 'Los PINs no coinciden',
  path: ['confirmPin'],
});

export const loginSchema = z.object({
  email: emailSchema,
  pin: z.string().regex(/^\d{6}$/, 'El PIN debe ser de 6 dígitos'),
});

export const changePinSchema = z.object({
  currentPin: z.string().regex(/^\d{6}$/, 'El PIN debe ser de 6 dígitos'),
  newPin: pinSchema,
  confirmNewPin: z.string().regex(/^\d{6}$/, 'Confirma tu nuevo PIN'),
}).refine((data) => data.newPin === data.confirmNewPin, {
  message: 'Los PINs no coinciden',
  path: ['confirmNewPin'],
}).refine((data) => data.currentPin !== data.newPin, {
  message: 'El nuevo PIN debe ser diferente al actual',
  path: ['newPin'],
});

export const resetPinSchema = z.object({
  email: emailSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePinInput = z.infer<typeof changePinSchema>;
export type ResetPinInput = z.infer<typeof resetPinSchema>;
