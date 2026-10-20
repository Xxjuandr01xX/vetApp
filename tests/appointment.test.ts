import { describe, it, expect } from 'vitest';
import { appointmentSchema } from '../lib/validations/appointment';

describe('Appointment Validation Schema', () => {
  it('validates a complete valid appointment', () => {
    const valid = {
      petId: 'pet-12345',
      date: '2026-10-15T10:30',
      durationMin: 30,
      reason: 'Vacunación sextuple',
      notes: 'Paciente agresivo con otros perros',
      status: 'scheduled',
    };

    const res = appointmentSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('fails when petId is missing', () => {
    const invalid = {
      petId: '',
      date: '2026-10-15T10:30',
      reason: 'Consulta',
    };
    const res = appointmentSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('fails when reason is empty', () => {
    const invalid = {
      petId: 'pet-123',
      date: '2026-10-15T10:30',
      reason: '   ',
    };
    const res = appointmentSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('validates status options correctly', () => {
    const statuses = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;
    statuses.forEach((st) => {
      const res = appointmentSchema.safeParse({
        petId: 'pet-123',
        date: '2026-10-15T10:30',
        reason: 'Control',
        status: st,
      });
      expect(res.success).toBe(true);
    });

    const invalidStatus = appointmentSchema.safeParse({
      petId: 'pet-123',
      date: '2026-10-15T10:30',
      reason: 'Control',
      status: 'pending', // invalid status
    });
    expect(invalidStatus.success).toBe(false);
  });

  it('validates appointment with valid servicePrice', () => {
    const validWithPrice = {
      petId: 'pet-12345',
      date: '2026-10-15T10:30',
      durationMin: 30,
      reason: 'Consulta general y desparasitación',
      status: 'scheduled',
      servicePrice: {
        amountUSD: 25.0,
        amountVES: 987.5,
        rateUsed: 39.5,
        rateDate: '2026-10-15',
        rateSource: 'DolarAPI - BCV Oficial',
      },
    };

    const res = appointmentSchema.safeParse(validWithPrice);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.servicePrice?.amountUSD).toBe(25.0);
      expect(res.data.servicePrice?.amountVES).toBe(987.5);
      expect(res.data.servicePrice?.rateDate).toBe('2026-10-15');
    }
  });

  it('rejects appointment with negative servicePrice amountUSD', () => {
    const invalidPrice = {
      petId: 'pet-12345',
      date: '2026-10-15T10:30',
      durationMin: 30,
      reason: 'Consulta general',
      servicePrice: {
        amountUSD: -10,
        amountVES: 395,
        rateUsed: 39.5,
        rateSource: 'BCV',
      },
    };

    const res = appointmentSchema.safeParse(invalidPrice);
    expect(res.success).toBe(false);
  });
});

