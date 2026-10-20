import { z } from 'zod';
import { SPECIES } from '@/lib/constants';

export const petSchema = z.object({
  name: z.string().trim().min(1, 'El nombre de la mascota es requerido').max(50, 'Máximo 50 caracteres'),
  species: z.enum(SPECIES, {
    errorMap: () => ({ message: 'Selecciona una especie válida' }),
  }),
  breed: z.string().trim().max(50, 'Máximo 50 caracteres').optional().or(z.literal('')),
  sex: z.enum(['M', 'F'], {
    errorMap: () => ({ message: 'Selecciona el sexo (M o F)' }),
  }),
  neutered: z.boolean().default(false),
  birthDate: z.string().optional().or(z.literal('')),
  weightKg: z
    .number({ invalid_type_error: 'El peso debe ser un número válido' })
    .positive('El peso debe ser mayor a 0')
    .max(1500, 'Peso inválido')
    .optional()
    .nullable(),
  color: z.string().trim().max(40).optional().or(z.literal('')),
  microchip: z.string().trim().max(30).optional().or(z.literal('')),
  photoUrl: z.string().url().optional().or(z.literal('')),
  owner: z.object({
    name: z.string().trim().min(2, 'El nombre del dueño es requerido').max(60),
    phone: z.string().trim().min(7, 'Número de teléfono inválido').max(20),
    email: z.string().trim().email('Email inválido').optional().or(z.literal('')),
    address: z.string().trim().max(120).optional().or(z.literal('')),
  }),
  allergies: z.array(z.string().trim()).default([]),
  chronicConditions: z.array(z.string().trim()).default([]),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'deceased']).default('active'),
});

export type PetFormData = z.infer<typeof petSchema>;
