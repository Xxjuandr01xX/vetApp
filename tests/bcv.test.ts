import { describe, it, expect } from 'vitest';
import {
  calcVES,
  formatVES,
  formatUSD,
  buildServicePrice,
  parseDolarApiRates,
} from '@/lib/utils/currency';
import { DolarApiItem } from '@/lib/types/bcv';

describe('Cálculo de Precios y Tasas BCV (Sprint 6)', () => {
  describe('calcVES', () => {
    it('calcula correctamente el monto en Bs. redondeado a 2 decimales', () => {
      // 10 USD a 876.6505 = 8766.505 -> redondeado a 8766.51
      const result = calcVES(10, 876.6505);
      expect(result).toBe(8766.51);
    });

    it('calcula montos con decimales exactos', () => {
      // 12.50 USD a 50 = 625.00
      expect(calcVES(12.5, 50)).toBe(625);
    });

    it('retorna 0 ante valores negativos o nulos', () => {
      expect(calcVES(0, 870)).toBe(0);
      expect(calcVES(-10, 870)).toBe(0);
      expect(calcVES(10, 0)).toBe(0);
      expect(calcVES(10, -50)).toBe(0);
    });
  });

  describe('formatVES y formatUSD', () => {
    it('formatea en Bolívares con prefijo Bs.', () => {
      const formatted = formatVES(1250.5);
      expect(formatted).toMatch(/^Bs\.\s/);
      // Contiene los dígitos
      expect(formatted).toContain('1');
      expect(formatted).toContain('250');
    });

    it('formatea en Dólares con símbolo $', () => {
      const formatted = formatUSD(25);
      expect(formatted).toContain('$25.00');
    });
  });

  describe('buildServicePrice', () => {
    it('genera un objeto ServicePrice completo con trazabilidad', () => {
      const price = buildServicePrice({
        amountUSD: 20,
        rate: 875.5,
        rateDate: '2026-10-13',
        rateSource: 'DolarAPI (BCV)',
        currency: 'USD',
        isManualRate: false,
      });

      expect(price).toEqual({
        amountUSD: 20,
        amountVES: 17510,
        rateUsed: 875.5,
        rateDate: '2026-10-13',
        rateSource: 'DolarAPI (BCV)',
        currency: 'USD',
        isManualRate: false,
      });
    });

    it('soporta tasa manual personalizada', () => {
      const price = buildServicePrice({
        amountUSD: 15,
        rate: 900,
        rateDate: '2026-10-13',
        rateSource: 'Tasa personalizada',
        isManualRate: true,
      });

      expect(price.isManualRate).toBe(true);
      expect(price.rateUsed).toBe(900);
      expect(price.amountVES).toBe(13500);
    });
  });

  describe('parseDolarApiRates', () => {
    const mockApiResponse: DolarApiItem[] = [
      {
        moneda: 'USD',
        fuente: 'oficial',
        nombre: 'Dólar Oficial',
        promedio: 876.7976,
        fechaActualizacion: '2026-10-13T00:00:00-04:00',
      },
      {
        moneda: 'EUR',
        fuente: 'oficial',
        nombre: 'Euro Oficial',
        promedio: 982.0045,
        fechaActualizacion: '2026-10-13T00:00:00-04:00',
      },
      {
        moneda: 'USD',
        fuente: 'paralelo',
        nombre: 'Dólar Paralelo',
        promedio: 1050.2,
        fechaActualizacion: '2026-10-13T00:00:00-04:00',
      },
    ];

    it('extrae las tasas oficiales de USD y EUR correctamente ignorando el paralelo', () => {
      const parsed = parseDolarApiRates(mockApiResponse, '2026-10-13');

      expect(parsed.date).toBe('2026-10-13');
      expect(parsed.usd).toBe(876.7976);
      expect(parsed.eur).toBe(982.0045);
      expect(parsed.usdUpdatedAt).toBe('2026-10-13T00:00:00-04:00');
      expect(parsed.eurUpdatedAt).toBe('2026-10-13T00:00:00-04:00');
      expect(parsed.source).toBe('DolarAPI (BCV)');
    });

    it('lanza error si falta la cotización oficial de USD', () => {
      const badData: DolarApiItem[] = [
        {
          moneda: 'EUR',
          fuente: 'oficial',
          nombre: 'Euro',
          promedio: 980,
          fechaActualizacion: '2026-10-13',
        },
      ];

      expect(() => parseDolarApiRates(badData)).toThrow('Sin cotizaciones oficiales');
    });

    it('lanza error si la respuesta no es un arreglo', () => {
      expect(() => parseDolarApiRates({} as any)).toThrow('Respuesta de cotizaciones inválida');
    });
  });
});
