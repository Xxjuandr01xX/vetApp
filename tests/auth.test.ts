import { describe, it, expect } from 'vitest';
import { pinSchema, emailSchema, registerSchema, loginSchema } from '../lib/validations/auth';

describe('Auth Validation Schemas', () => {
  describe('emailSchema', () => {
    it('accepts valid email addresses', () => {
      expect(emailSchema.safeParse('veterinario@ejemplo.com').success).toBe(true);
      expect(emailSchema.safeParse('dra.ana@vet.ve').success).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(emailSchema.safeParse('correo-invalido').success).toBe(false);
      expect(emailSchema.safeParse('').success).toBe(false);
    });
  });

  describe('pinSchema', () => {
    it('accepts valid 6-digit non-sequential PIN', () => {
      expect(pinSchema.safeParse('483920').success).toBe(true);
      expect(pinSchema.safeParse('849201').success).toBe(true);
    });

    it('rejects known weak PINs', () => {
      expect(pinSchema.safeParse('123456').success).toBe(false);
      expect(pinSchema.safeParse('000000').success).toBe(false);
      expect(pinSchema.safeParse('654321').success).toBe(false);
      expect(pinSchema.safeParse('112233').success).toBe(false);
    });

    it('rejects sequential PINs', () => {
      expect(pinSchema.safeParse('012345').success).toBe(false);
      expect(pinSchema.safeParse('234567').success).toBe(false);
      expect(pinSchema.safeParse('987654').success).toBe(false);
    });

    it('rejects PINs that are not 6 digits', () => {
      expect(pinSchema.safeParse('12345').success).toBe(false);
      expect(pinSchema.safeParse('1234567').success).toBe(false);
      expect(pinSchema.safeParse('abcdef').success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('validates matching PIN and valid data', () => {
      const valid = registerSchema.safeParse({
        email: 'ana@clinica.com',
        displayName: 'Dra. Ana Pérez',
        pin: '739182',
        confirmPin: '739182',
      });
      expect(valid.success).toBe(true);
    });

    it('fails when PIN and confirmPin do not match', () => {
      const invalid = registerSchema.safeParse({
        email: 'ana@clinica.com',
        displayName: 'Dra. Ana Pérez',
        pin: '739182',
        confirmPin: '999999',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('validates proper email and 6-digit PIN', () => {
      const result = loginSchema.safeParse({
        email: 'doctor@veterinaria.com',
        pin: '948201',
      });
      expect(result.success).toBe(true);
    });
  });
});
