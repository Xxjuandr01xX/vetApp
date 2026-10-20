import { describe, it, expect } from 'vitest';
import { treatmentSchema, treatmentMedicationSchema } from '../lib/validations/treatment';

describe('Treatment Validation Schema', () => {
  it('validates a complete valid treatment', () => {
    const validTreatment = {
      petId: 'pet-123',
      diagnosis: 'Gastroenteritis infecciosa',
      weightAtVisit: 12.5,
      medications: [
        {
          medicationId: 'med-01',
          commercialName: 'Clavamox',
          activeIngredient: 'Amoxicilina + Ácido Clavulánico',
          dose: '12.5 mg/kg',
          route: 'Oral',
          frequency: 'Cada 12 horas',
          durationDays: 7,
          notes: 'Administrar con comida',
        },
      ],
      procedures: ['Hidratación subcutánea', 'Control térmico'],
      recommendations: 'Dieta blanda y reposo durante 48 horas',
    };

    const result = treatmentSchema.safeParse(validTreatment);
    expect(result.success).toBe(true);
  });

  it('validates a treatment with minimal required fields', () => {
    const minimalTreatment = {
      petId: 'pet-456',
      diagnosis: 'Control preventivo general',
    };

    const result = treatmentSchema.safeParse(minimalTreatment);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.medications).toEqual([]);
      expect(result.data.procedures).toEqual([]);
    }
  });

  it('fails when petId is missing', () => {
    const invalid = {
      diagnosis: 'Otitis externa',
    };

    const result = treatmentSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('fails when diagnosis is empty', () => {
    const invalid = {
      petId: 'pet-789',
      diagnosis: '',
    };

    const result = treatmentSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('fails when medication dose or frequency is missing', () => {
    const invalidMed = {
      commercialName: 'Meloxicam',
      activeIngredient: 'Meloxicam',
      dose: '',
      frequency: 'Cada 24 horas',
      durationDays: 5,
    };

    const result = treatmentMedicationSchema.safeParse(invalidMed);
    expect(result.success).toBe(false);
  });

  it('validates medication schema with valid inputs', () => {
    const validMed = {
      commercialName: 'Baytril',
      activeIngredient: 'Enrofloxacina',
      dose: '5 mg/kg',
      frequency: 'Cada 24 horas',
      durationDays: 10,
      notes: 'Vía oral después del desayuno',
    };

    const result = treatmentMedicationSchema.safeParse(validMed);
    expect(result.success).toBe(true);
  });

  it('validates treatment schema with valid servicePrice', () => {
    const treatmentWithPrice = {
      petId: 'pet-123',
      diagnosis: 'Chequeo general y vacuna',
      servicePrice: {
        amountUSD: 25,
        amountVES: 21919.94,
        rateUsed: 876.7976,
        rateDate: '2026-10-13',
        rateSource: 'DolarAPI (BCV)',
        currency: 'USD',
        isManualRate: false,
      },
    };

    const result = treatmentSchema.safeParse(treatmentWithPrice);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.servicePrice?.amountUSD).toBe(25);
      expect(result.data.servicePrice?.amountVES).toBe(21919.94);
    }
  });

  it('fails when servicePrice has negative amounts or zero rate', () => {
    const invalidPrice = {
      petId: 'pet-123',
      diagnosis: 'Chequeo',
      servicePrice: {
        amountUSD: -10,
        amountVES: -800,
        rateUsed: 0,
        rateDate: '',
      },
    };

    const result = treatmentSchema.safeParse(invalidPrice);
    expect(result.success).toBe(false);
  });
});
