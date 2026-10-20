import { describe, it, expect } from 'vitest';
import {
  normalizeSearchText,
  SYSTEM_ACTIONS,
  filterQuickActions,
} from '../lib/services/search';

describe('Global Search & Cmd+K Suite (Sprint 9)', () => {
  describe('1. normalizeSearchText', () => {
    it('elimina acentos y normaliza a minúsculas', () => {
      expect(normalizeSearchText('Clínica')).toBe('clinica');
      expect(normalizeSearchText('Vademécum')).toBe('vademecum');
      expect(normalizeSearchText('  ATENCIÓN  ')).toBe('atencion');
      expect(normalizeSearchText('ÁÉÍÓÚñ')).toBe('aeioun');
    });

    it('maneja strings vacíos o nulos limpiamente', () => {
      expect(normalizeSearchText('')).toBe('');
      expect(normalizeSearchText(null as any)).toBe('');
      expect(normalizeSearchText(undefined as any)).toBe('');
    });
  });

  describe('2. Acciones del Sistema (Quick Actions)', () => {
    it('contiene las acciones principales requeridas', () => {
      const ids = SYSTEM_ACTIONS.map((a) => a.id);
      expect(ids).toContain('act-new-pet');
      expect(ids).toContain('act-new-appointment');
      expect(ids).toContain('act-new-treatment');
      expect(ids).toContain('act-dashboard');
      expect(ids).toContain('act-pets');
      expect(ids).toContain('act-appointments');
      expect(ids).toContain('act-treatments');
      expect(ids).toContain('act-settings');
      expect(ids).toContain('act-pricing');
    });

    it('cada acción contiene title, subtitle, href válido y keywords', () => {
      for (const act of SYSTEM_ACTIONS) {
        expect(act.title.length).toBeGreaterThan(0);
        expect(act.subtitle.length).toBeGreaterThan(0);
        expect(act.href.startsWith('/')).toBe(true);
        expect(act.keywords.length).toBeGreaterThan(0);
      }
    });
  });

  describe('3. filterQuickActions (Búsqueda en memoria sin latencia)', () => {
    it('devuelve las acciones sugeridas cuando el query es corto o vacío', () => {
      const results = filterQuickActions('');
      expect(results.length).toBe(4);
      expect(results[0].type).toBe('action');
    });

    it('encuentra la acción de registrar paciente cuando se busca "paciente"', () => {
      const results = filterQuickActions('paciente');
      const petActions = results.filter((r) => r.type === 'action' && r.href.includes('/pets'));
      expect(petActions.length).toBeGreaterThan(0);
    });

    it('encuentra la acción de agendar cita cuando se busca "agendar"', () => {
      const results = filterQuickActions('agendar');
      const appAction = results.find((r) => r.id === 'act-new-appointment');
      expect(appAction).toBeDefined();
      expect(appAction?.href).toBe('/appointments/new');
    });

    it('encuentra la acción de suscripción premium cuando se busca "bolivares" o "premium"', () => {
      const results = filterQuickActions('bolivares');
      const pricingAction = results.find((r) => r.id === 'act-pricing');
      expect(pricingAction).toBeDefined();
      expect(pricingAction?.href).toBe('/pricing');
    });
  });
});
