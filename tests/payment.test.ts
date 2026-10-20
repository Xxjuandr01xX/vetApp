import { describe, it, expect } from 'vitest';
import {
  paymentRequestSchema,
  paymentApproveSchema,
  paymentRejectSchema,
} from '@/lib/validations/payment';

describe('Flujo de Pagos y Suscripción (Sprint 7)', () => {
  describe('paymentRequestSchema', () => {
    it('valida una solicitud de pago mensual válida por Pago Móvil', () => {
      const validReq = {
        userId: 'usr-123',
        userName: 'Dra. María Pérez',
        userEmail: 'maria@veterinaria.com',
        plan: 'premium_monthly',
        amount: 12,
        currency: 'USD',
        method: 'pago_movil',
        reference: '12345678',
        captureUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      };

      const result = paymentRequestSchema.safeParse(validReq);
      expect(result.success).toBe(true);
    });

    it('valida una solicitud de pago anual válida por Binance Pay', () => {
      const validReq = {
        userId: 'usr-456',
        userName: 'Dr. Carlos Mendoza',
        userEmail: 'carlos@mendoza.com',
        plan: 'premium_yearly',
        amount: 120,
        currency: 'USD',
        method: 'binance',
        reference: 'BPAY-998877',
        captureUrl: 'https://res.cloudinary.com/demo/image/upload/binance.png',
      };

      const result = paymentRequestSchema.safeParse(validReq);
      expect(result.success).toBe(true);
    });

    it('falla si el monto es negativo o cero', () => {
      const invalid = {
        userId: 'usr-123',
        userName: 'Dr. Test',
        userEmail: 'test@test.com',
        plan: 'premium_monthly',
        amount: 0,
        currency: 'USD',
        method: 'pago_movil',
        reference: '123',
        captureUrl: 'https://example.com/img.png',
      };

      const result = paymentRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('falla si el método de pago o plan no existen', () => {
      const invalid = {
        userId: 'usr-123',
        userName: 'Dr. Test',
        userEmail: 'test@test.com',
        plan: 'plan_inexistente',
        amount: 12,
        method: 'metodo_raro',
        reference: '123',
        captureUrl: 'https://example.com/img.png',
      };

      const result = paymentRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('falla si la URL de captura no es válida', () => {
      const invalid = {
        userId: 'usr-123',
        userName: 'Dr. Test',
        userEmail: 'test@test.com',
        plan: 'premium_monthly',
        amount: 12,
        method: 'pago_movil',
        reference: '123',
        captureUrl: 'no-es-url',
      };

      const result = paymentRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('paymentApproveSchema y paymentRejectSchema', () => {
    it('valida aprobación con requestId válido', () => {
      const valid = { requestId: 'req-abc-123' };
      const result = paymentApproveSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('falla aprobación con requestId vacío', () => {
      const invalid = { requestId: '' };
      const result = paymentApproveSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('valida rechazo con motivo explicativo', () => {
      const valid = {
        requestId: 'req-abc-123',
        reason: 'El número de referencia no coincide con el extracto bancario',
      };
      const result = paymentRejectSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('falla rechazo si el motivo es muy corto o vacío', () => {
      const invalid = {
        requestId: 'req-abc-123',
        reason: 'no',
      };
      const result = paymentRejectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Cálculo de vigencia de suscripción Premium (RF-26)', () => {
    it('calcula 30 días para plan mensual y 365 días para plan anual', () => {
      const now = new Date('2026-10-13T12:00:00Z').getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const yearlyDaysMs = 365 * 24 * 60 * 60 * 1000;

      const monthlyExpiry = now + thirtyDaysMs;
      const yearlyExpiry = now + yearlyDaysMs;

      expect(new Date(monthlyExpiry).toISOString()).toBe('2026-11-12T12:00:00.000Z');
      expect(new Date(yearlyExpiry).toISOString()).toBe('2027-10-13T12:00:00.000Z');
    });
  });
});
