import { describe, it, expect } from 'vitest';
import {
  calculateDoseByWeight,
  parsePresentationConcentration,
  getSuggestedDoseMgPerKg,
} from '../lib/utils/dosage-calculator';
import { customMedicationSchema } from '../lib/validations/medication';
import { createCustomMedication } from '../lib/services/medications';
import { Medication } from '../lib/types/medication';

describe('Sprint 11 — Calculadora de Dosis por Peso y Medicamentos Personalizados (RF-22)', () => {
  describe('1. calculateDoseByWeight (Cálculo exacto de mg y unidades)', () => {
    it('calcula correctamente mL para una suspensión oral (ej. Amoxicilina 50 mg/ml, perro de 12 kg a 12.5 mg/kg)', () => {
      const result = calculateDoseByWeight({
        weightKg: 12,
        doseMgPerKg: 12.5,
        concentrationMgPerUnit: 50,
        unitType: 'ml',
      });

      expect(result.totalMg).toBe(150);
      expect(result.unitsToAdminister).toBe(3);
      expect(result.unitLabel).toBe('ml');
      expect(result.formattedDose).toBe('3 ml (150 mg totales — 12.5 mg/kg)');
    });

    it('calcula correctamente comprimidos fraccionados (ej. Carprofeno 100 mg, perro de 22.7 kg a 2.2 mg/kg)', () => {
      const result = calculateDoseByWeight({
        weightKg: 22.7,
        doseMgPerKg: 2.2,
        concentrationMgPerUnit: 100,
        unitType: 'comprimido',
      });

      expect(result.totalMg).toBe(49.94);
      expect(result.unitsToAdminister).toBe(0.5);
      expect(result.unitLabel).toBe('comprimidos');
    });

    it('usa singular cuando la cantidad a administrar es exactamente 1 comprimido', () => {
      const result = calculateDoseByWeight({
        weightKg: 10,
        doseMgPerKg: 10,
        concentrationMgPerUnit: 100,
        unitType: 'comprimido',
      });

      expect(result.totalMg).toBe(100);
      expect(result.unitsToAdminister).toBe(1);
      expect(result.unitLabel).toBe('comprimido');
    });

    it('redondea a 2 decimales evitando errores de punto flotante IEEE 754', () => {
      const result = calculateDoseByWeight({
        weightKg: 4.3,
        doseMgPerKg: 0.1,
        concentrationMgPerUnit: 1.5,
        unitType: 'ml',
      });

      expect(result.totalMg).toBe(0.43);
      expect(result.unitsToAdminister).toBe(0.29);
    });

    it('lanza error si peso, dosis o concentración son menores o iguales a 0', () => {
      expect(() =>
        calculateDoseByWeight({
          weightKg: 0,
          doseMgPerKg: 10,
          concentrationMgPerUnit: 50,
        })
      ).toThrow();

      expect(() =>
        calculateDoseByWeight({
          weightKg: 10,
          doseMgPerKg: -5,
          concentrationMgPerUnit: 50,
        })
      ).toThrow();

      expect(() =>
        calculateDoseByWeight({
          weightKg: 10,
          doseMgPerKg: 10,
          concentrationMgPerUnit: 0,
        })
      ).toThrow();
    });
  });

  describe('2. parsePresentationConcentration (Extractor de concentración y forma)', () => {
    it('detecta concentración en mg/ml y asigna unidad "ml"', () => {
      const parsed = parsePresentationConcentration('50mg/ml', 'Suspensión oral');
      expect(parsed.concentrationMgPerUnit).toBe(50);
      expect(parsed.unitType).toBe('ml');
    });

    it('soporta decimales con coma o punto (ej. "1,5 mg/ml")', () => {
      const parsed = parsePresentationConcentration('1,5 mg/ml', 'Gotas orales');
      expect(parsed.concentrationMgPerUnit).toBe(1.5);
      expect(parsed.unitType).toBe('ml');
    });

    it('detecta comprimidos y tabletas sólidas', () => {
      const parsedComp = parsePresentationConcentration('250mg', 'Comprimidos ranurados');
      expect(parsedComp.concentrationMgPerUnit).toBe(250);
      expect(parsedComp.unitType).toBe('comprimido');

      const parsedTab = parsePresentationConcentration('100 mg', 'Tableta masticable');
      expect(parsedTab.concentrationMgPerUnit).toBe(100);
      expect(parsedTab.unitType).toBe('tableta');
    });
  });

  describe('3. getSuggestedDoseMgPerKg (Dosis de referencia clínica)', () => {
    it('prioriza defaultDoseMgPerKg cuando el medicamento personalizado lo define', () => {
      const customMed: Medication = {
        id: 'custom-1',
        commercialNames: ['MiFármaco Vet'],
        activeIngredients: [{ name: 'Amoxicilina', concentration: '50', unit: 'mg/ml' }],
        therapeuticClass: 'Antibiótico',
        pharmacologicalAction: 'Bactericida',
        presentations: [{ id: 'pres-1', form: 'Suspensión', concentration: '50mg/ml', route: 'Oral' }],
        targetSpecies: ['Canino'],
        indications: [],
        contraindications: [],
        searchKeywords: ['amoxicilina'],
        createdBy: 'vet-1',
        version: 1,
        isGlobal: false,
        defaultDoseMgPerKg: 20,
      };

      expect(getSuggestedDoseMgPerKg(customMed)).toBe(20);
    });

    it('sugiere la dosis clínica estándar según el principio activo (ej. Meloxicam = 0.1, Doxiciclina = 10)', () => {
      const meloxicamMed: Medication = {
        id: 'med-melox',
        commercialNames: ['Meloxivet'],
        activeIngredients: [{ name: 'Meloxicam', concentration: '1.5', unit: 'mg/ml' }],
        therapeuticClass: 'AINE',
        pharmacologicalAction: 'Antiinflamatorio',
        presentations: [{ id: 'pres-1', form: 'Suspensión', concentration: '1.5mg/ml', route: 'Oral' }],
        targetSpecies: ['Canino', 'Felino'],
        indications: [],
        contraindications: [],
        searchKeywords: ['meloxicam'],
        createdBy: 'system',
        version: 1,
        isGlobal: true,
      };

      expect(getSuggestedDoseMgPerKg(meloxicamMed)).toBe(0.1);
    });

    it('retorna 10 mg/kg como fallback seguro cuando el principio activo no está en la tabla', () => {
      const unknownMed: Medication = {
        id: 'med-unknown',
        commercialNames: ['Suplemento Hepático X'],
        activeIngredients: [{ name: 'Silimarina Pura', concentration: '100', unit: 'mg' }],
        therapeuticClass: 'Hepatoprotector',
        pharmacologicalAction: 'Antioxidante',
        presentations: [{ id: 'pres-1', form: 'Comprimidos', concentration: '100mg', route: 'Oral' }],
        targetSpecies: ['Canino'],
        indications: [],
        contraindications: [],
        searchKeywords: ['silimarina'],
        createdBy: 'vet-1',
        version: 1,
        isGlobal: false,
      };

      expect(getSuggestedDoseMgPerKg(unknownMed)).toBe(10);
    });
  });

  describe('4. customMedicationSchema & Guard de Suscripción Premium (RF-22)', () => {
    it('valida correctamente un medicamento personalizado completo', () => {
      const result = customMedicationSchema.safeParse({
        commercialName: 'EnroVet Plus 10%',
        activeIngredientName: 'Enrofloxacina',
        concentration: '100',
        unit: 'mg/ml',
        therapeuticClass: 'Antibiótico Fluoroquinolona',
        pharmacologicalAction: 'Inhibidor de ADN girasa',
        presentationForm: 'Solución inyectable',
        route: 'Subcutánea',
        targetSpecies: ['Canino', 'Felino'],
        defaultDoseMgPerKg: 5,
        indications: 'Infecciones respiratorias y dérmicas',
        contraindications: 'Cachorros en crecimiento',
      });

      expect(result.success).toBe(true);
    });

    it('rechaza medicamento personalizado sin especies destino o sin nombre comercial', () => {
      const invalid = customMedicationSchema.safeParse({
        commercialName: 'A',
        activeIngredientName: '',
        concentration: '',
        unit: 'mg',
        therapeuticClass: 'Antibiótico',
        presentationForm: 'Comprimidos',
        route: 'Oral',
        targetSpecies: [],
      });

      expect(invalid.success).toBe(false);
    });

    it('bloquea la creación de medicamentos personalizados para usuarios del plan gratuito (free)', async () => {
      const result = await createCustomMedication(
        'vet-free-123',
        {
          commercialName: 'Fármaco Prueba',
          activeIngredientName: 'Amoxicilina',
          concentration: '250',
          unit: 'mg',
          therapeuticClass: 'Antibiótico',
          pharmacologicalAction: 'Bactericida',
          presentationForm: 'Comprimidos',
          route: 'Oral',
          targetSpecies: ['Canino'],
          defaultDoseMgPerKg: 12.5,
          indications: 'Infección',
          contraindications: '',
        },
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/exclusiva del Plan Premium/i);
    });
  });
});
