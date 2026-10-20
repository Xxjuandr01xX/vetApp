import { z } from 'zod';

export const customMedicationSchema = z.object({
  commercialName: z
    .string()
    .trim()
    .min(2, 'El nombre comercial debe tener al menos 2 caracteres')
    .max(120, 'Máximo 120 caracteres'),
  activeIngredientName: z
    .string()
    .trim()
    .min(2, 'El principio activo es obligatorio')
    .max(120, 'Máximo 120 caracteres'),
  concentration: z
    .string()
    .trim()
    .min(1, 'La concentración es obligatoria (ej. 250, 50, 1.5)')
    .max(50),
  unit: z
    .string()
    .trim()
    .min(1, 'La unidad es obligatoria (ej. mg, mg/ml)')
    .default('mg/ml'),
  therapeuticClass: z
    .string()
    .trim()
    .min(2, 'La clase terapéutica es obligatoria')
    .max(100),
  pharmacologicalAction: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal('')),
  presentationForm: z
    .string()
    .trim()
    .min(2, 'La forma farmacéutica es obligatoria (ej. Comprimidos, Suspensión oral)')
    .default('Comprimidos'),
  route: z
    .string()
    .trim()
    .min(2, 'La vía de administración es obligatoria')
    .default('Oral'),
  targetSpecies: z
    .array(z.string().trim())
    .min(1, 'Selecciona al menos una especie destino'),
  defaultDoseMgPerKg: z
    .number()
    .positive('La dosis de referencia (mg/kg) debe ser mayor a 0')
    .max(2000, 'Valor fuera de rango clínico')
    .optional(),
  indications: z.string().trim().max(500).optional().or(z.literal('')),
  contraindications: z.string().trim().max(500).optional().or(z.literal('')),
});

export type CustomMedicationFormData = z.infer<typeof customMedicationSchema>;
