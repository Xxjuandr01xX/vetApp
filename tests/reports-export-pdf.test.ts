import { describe, it, expect } from 'vitest';
import {
  formatWhatsAppPhone,
  buildWhatsAppMessage,
} from '../components/domain/ShareTreatmentModal';
import {
  formatWhatsAppPhone as formatWaAppointment,
  buildAppointmentWhatsAppMessage,
} from '../components/domain/ShareAppointmentModal';
import {
  exportPetsToCsv,
  exportAppointmentsToCsv,
  exportTreatmentsToCsv,
  convertToCsv,
} from '../lib/utils/export-csv';
import { calculateReportsSummary } from '../lib/services/reports';
import { Pet } from '../lib/types/pet';
import { Appointment } from '../lib/types/appointment';
import { Treatment } from '../lib/types/treatment';

describe('Sprint 12 — Recetas PDF, Compartir por WhatsApp y Reportes de Exportación', () => {
  const dummyPet: Pet = {
    id: 'pet-123',
    vetId: 'vet-456',
    name: 'Firulais',
    species: 'Canino',
    breed: 'Golden Retriever',
    sex: 'M',
    neutered: true,
    weightKg: 28.5,
    owner: {
      name: 'Carlos Mendoza',
      phone: '0414-1234567',
      email: 'carlos@example.com',
      address: 'Caracas, Venezuela',
    },
    allergies: ['Penicilina'],
    chronicConditions: ['Displasia leve'],
    notes: 'Muy dócil durante consulta',
    status: 'active',
    createdAt: new Date('2026-01-10') as any,
    updatedAt: new Date('2026-01-15') as any,
  };

  const dummyTreatment: Treatment = {
    id: 'trt-789',
    vetId: 'vet-456',
    petId: 'pet-123',
    petName: 'Firulais',
    diagnosis: 'Gastroenteritis bacteriana aguda',
    weightAtVisit: 28.5,
    medications: [
      {
        medicationId: 'med-1',
        commercialName: 'EnroVet 10%',
        activeIngredient: 'Enrofloxacina',
        dose: '2.8 ml',
        route: 'Oral',
        frequency: 'Cada 24 horas',
        durationDays: 7,
        notes: 'Administrar con las comidas',
      },
    ],
    procedures: ['Hidratación subcutánea', 'Control de temperatura'],
    recommendations: 'Dieta blanda (pollo hervido y arroz) durante 48 horas',
    servicePrice: {
      amountUSD: 25,
      amountVES: 21891.26,
      rateUsed: 875.6505,
      rateDate: '2026-10-17',
      rateSource: 'DolarAPI (BCV)',
      currency: 'USD',
      isManualRate: false,
    },
    createdAt: new Date('2026-10-17T10:00:00Z'),
  };

  const dummyAppointment: Appointment = {
    id: 'app-999',
    vetId: 'vet-456',
    petId: 'pet-123',
    petName: 'Firulais',
    petSpecies: 'Canino',
    ownerName: 'Carlos Mendoza',
    ownerPhone: '0424-7654321',
    date: new Date('2026-10-20T14:30:00Z'),
    durationMin: 30,
    reason: 'Control y seguimiento gastrointestinal',
    status: 'completed',
    servicePrice: {
      amountUSD: 15,
      amountVES: 13134.75,
      rateUsed: 875.6505,
      rateDate: '2026-10-17',
      rateSource: 'DolarAPI (BCV)',
      currency: 'USD',
      isManualRate: false,
    },
    notes: 'Revisar evolución y heces',
    createdAt: new Date('2026-10-17T11:00:00Z') as any,
  };

  describe('1. Formateo de teléfonos y mensajes para WhatsApp (Venezuela 58)', () => {
    it('formatea números celulares locales de Venezuela a formato internacional 58', () => {
      expect(formatWhatsAppPhone('0414-1234567')).toBe('584141234567');
      expect(formatWhatsAppPhone('0424 765 4321')).toBe('584247654321');
      expect(formatWhatsAppPhone('04121112233')).toBe('584121112233');
      expect(formatWaAppointment('4149998877')).toBe('584149998877');
    });

    it('respeta números que ya vienen con código de país internacional y corrige +5804...', () => {
      expect(formatWhatsAppPhone('+58 414 1234567')).toBe('584141234567');
      expect(formatWhatsAppPhone('+58 0414-1234567')).toBe('584141234567');
      expect(formatWaAppointment('+58 0424-7654321')).toBe('584247654321');
      expect(formatWhatsAppPhone('14155552671')).toBe('14155552671');
      expect(formatWhatsAppPhone('')).toBe('');
    });

    it('construye el texto formateado del récipe médico para WhatsApp', () => {
      const msg = buildWhatsAppMessage(dummyTreatment, dummyPet, 'Dra. Valentina López');
      expect(msg).toContain('*RÉCIPE MÉDICO VETERINARIO*');
      expect(msg).toContain('Firulais');
      expect(msg).toContain('Carlos Mendoza');
      expect(msg).toContain('Gastroenteritis bacteriana aguda');
      expect(msg).toContain('EnroVet 10%');
      expect(msg).toContain('Dosis:* 2.8 ml');
      expect(msg).toContain('$25.00 USD');
      expect(msg).toContain('Dra. Valentina López');
    });

    it('construye el recordatorio de cita médica para WhatsApp', () => {
      const msg = buildAppointmentWhatsAppMessage(dummyAppointment, dummyPet, 'Dra. Valentina López');
      expect(msg).toContain('*RECORDATORIO DE CITA VETERINARIA*');
      expect(msg).toContain('Firulais');
      expect(msg).toContain('Control y seguimiento gastrointestinal');
      expect(msg).toContain('$15.00 USD');
      expect(msg).toContain('Dra. Valentina López');
    });
  });

  describe('2. Exportación a formato CSV (Pacientes, Citas, Tratamientos)', () => {
    it('escapa comillas y caracteres especiales correctamente', () => {
      const sample = convertToCsv(
        [
          { key: 'name', label: 'Nombre' },
          { key: 'desc', label: 'Descripción' },
        ],
        [{ name: 'Mascota "Prueba"', desc: 'Línea con coma, y salto' }]
      );
      expect(sample).toContain('"Mascota ""Prueba"""');
      expect(sample).toContain('"Línea con coma, y salto"');
    });

    it('exporta pacientes a CSV con cabeceras completas', () => {
      const csv = exportPetsToCsv([dummyPet]);
      expect(csv).toContain('"Nombre Mascota","Especie","Raza","Sexo","Esterilizado","Peso (kg)","Estado"');
      expect(csv).toContain('"Firulais"');
      expect(csv).toContain('"Carlos Mendoza"');
      expect(csv).toContain('"Penicilina"');
    });

    it('exporta citas a CSV incluyendo montos en USD y Bs.', () => {
      const csv = exportAppointmentsToCsv([dummyAppointment]);
      expect(csv).toContain('Motivo de Consulta');
      expect(csv).toContain('Honorarios (USD)');
      expect(csv).toContain('"Control y seguimiento gastrointestinal"');
      expect(csv).toContain('"15"');
    });

    it('exporta tratamientos a CSV con medicamentos y honorarios', () => {
      const csv = exportTreatmentsToCsv([dummyTreatment]);
      expect(csv).toContain('Diagnóstico');
      expect(csv).toContain('Medicamentos Prescritos');
      expect(csv).toContain('"Gastroenteritis bacteriana aguda"');
      expect(csv).toContain('EnroVet 10%');
    });
  });

  describe('3. Motor de Reportes y Métricas Clínicas', () => {
    it('calcula métricas correctas de pacientes, asistencia y facturación', () => {
      const summary = calculateReportsSummary(
        [dummyPet],
        [dummyAppointment],
        [dummyTreatment]
      );

      expect(summary.totalPets).toBe(1);
      expect(summary.activePets).toBe(1);
      expect(summary.speciesDistribution[0].species).toBe('Canino');
      expect(summary.speciesDistribution[0].percentage).toBe(100);

      expect(summary.totalAppointments).toBe(1);
      expect(summary.completedAppointments).toBe(1);
      expect(summary.completionRate).toBe(100);

      expect(summary.totalTreatments).toBe(1);
      // Facturación total: $25 (tratamiento) + $15 (cita completada) = $40 USD
      expect(summary.totalIncomeUSD).toBe(40);
      expect(summary.totalIncomeVES).toBeGreaterThan(30000);

      expect(summary.topDiagnoses[0].diagnosis).toBe('Gastroenteritis bacteriana aguda');
      expect(summary.topMedications[0].name).toBe('EnroVet 10%');
    });

    it('maneja listas vacías sin errores ni divisiones por cero', () => {
      const summary = calculateReportsSummary([], [], []);
      expect(summary.totalPets).toBe(0);
      expect(summary.totalAppointments).toBe(0);
      expect(summary.completionRate).toBe(0);
      expect(summary.totalIncomeUSD).toBe(0);
      expect(summary.averageIncomePerTreatmentUSD).toBe(0);
      expect(summary.speciesDistribution.length).toBe(0);
    });
  });
});
