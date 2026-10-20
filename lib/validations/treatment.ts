import { z } from 'zod';

export const treatmentMedicationSchema = z.object({
  medicationId: z.string().default(''),
  commercialName: z.string().trim().min(1, 'El nombre del medicamento es requerido'),
  activeIngredient: z.string().trim().min(1, 'El principio activo es requerido'),
  dose: z.string().trim().min(1, 'La dosis es requerida (ej. 1 tableta, 2 ml)'),
  route: z.string().trim().default('Oral'),
  frequency: z.string().trim().min(1, 'La frecuencia es requerida (ej. Cada 12 horas)'),
  durationDays: z.number().int().positive('La duración en días debe ser mayor a 0').default(7),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const servicePriceSchema = z.object({
  amountUSD: z.number().min(0, 'El monto en USD debe ser mayor o igual a 0'),
  amountVES: z.number().min(0, 'El monto en VES debe ser mayor o igual a 0'),
  rateUsed: z.number().positive('La tasa debe ser mayor a 0'),
  rateDate: z.string().min(1, 'La fecha de la tasa es requerida'),
  rateSource: z.string().default('DolarAPI (BCV)'),
  currency: z.enum(['USD', 'EUR']).default('USD'),
  isManualRate: z.boolean().default(false),
});

export const treatmentSchema = z.object({
  petId: z.string().min(1, 'Debes seleccionar un paciente'),
  diagnosis: z.string().trim().min(2, 'El diagnóstico es obligatorio').max(300),
  weightAtVisit: z.number().positive().max(1500).optional().nullable(),
  medications: z.array(treatmentMedicationSchema).default([]),
  procedures: z.array(z.string().trim()).default([]),
  recommendations: z.string().trim().max(1000).optional().or(z.literal('')),
  servicePrice: servicePriceSchema.optional(),
});

export type TreatmentFormData = z.infer<typeof treatmentSchema>;
export type TreatmentMedicationFormData = z.infer<typeof treatmentMedicationSchema>;
export type ServicePriceFormData = z.infer<typeof servicePriceSchema>;
