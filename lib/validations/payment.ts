import { z } from 'zod';

export const paymentRequestSchema = z.object({
  userId: z.string().min(1, 'El ID de usuario es obligatorio'),
  userName: z.string().min(2, 'El nombre de usuario es obligatorio'),
  userEmail: z.string().email('Email inválido'),
  plan: z.enum(['premium_monthly', 'premium_yearly'], {
    errorMap: () => ({ message: 'Plan de suscripción inválido' }),
  }),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  currency: z.enum(['USD', 'EUR']).default('USD'),
  method: z.enum(['pago_movil', 'binance'], {
    errorMap: () => ({ message: 'Método de pago inválido' }),
  }),
  reference: z.string().trim().min(3, 'La referencia debe tener al menos 3 caracteres'),
  captureUrl: z.string().url('La URL del comprobante debe ser válida'),
});

export const paymentApproveSchema = z.object({
  requestId: z.string().min(1, 'El requestId es obligatorio'),
});

export const paymentRejectSchema = z.object({
  requestId: z.string().min(1, 'El requestId es obligatorio'),
  reason: z.string().trim().min(3, 'Debes indicar el motivo del rechazo').max(300),
});

export type PaymentRequestInput = z.infer<typeof paymentRequestSchema>;
export type PaymentApproveInput = z.infer<typeof paymentApproveSchema>;
export type PaymentRejectInput = z.infer<typeof paymentRejectSchema>;
