import { z } from 'zod';
import { servicePriceSchema } from './treatment';

export const appointmentSchema = z.object({
  petId: z.string().min(1, 'Debes seleccionar un paciente'),
  date: z.string().min(1, 'La fecha y hora son obligatorias'),
  durationMin: z.number().int().min(10, 'Mínimo 10 minutos').max(240, 'Máximo 4 horas').default(30),
  reason: z.string().trim().min(2, 'El motivo de la cita es obligatorio').max(200, 'Máximo 200 caracteres'),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).default('scheduled'),
  servicePrice: servicePriceSchema.optional(),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;
