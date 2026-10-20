import { describe, it, expect } from 'vitest';
import { VADEMECUM } from '@/lib/data/vademecum';
import { searchByPrefix, normalizeText } from '@/lib/utils/medication-search';

describe('Vademécum', () => {
  it('contiene exactamente 100 medicamentos con id único', () => {
    expect(VADEMECUM.length).toBe(100);
    expect(new Set(VADEMECUM.map((m) => m.id)).size).toBe(100);
  });

  it('cada medicamento tiene datos mínimos válidos', () => {
    for (const m of VADEMECUM) {
      expect(m.commercialNames.length).toBeGreaterThan(0);
      expect(m.activeIngredients.length).toBeGreaterThan(0);
      expect(m.targetSpecies.length).toBeGreaterThan(0);
      expect(m.isGlobal).toBe(true);
    }
  });
});

describe('searchByPrefix', () => {
  it('normaliza acentos y mayúsculas', () => {
    expect(normalizeText('  Ácido Ursodesoxicólico ')).toBe('acido ursodesoxicolico');
  });

  it('encuentra por prefijo de nombre comercial', () => {
    const r = searchByPrefix(VADEMECUM, 'meta');
    expect(r.some((m) => m.id === 'med-meloxicam')).toBe(true); // Metacam
  });

  it('encuentra por prefijo de principio activo', () => {
    const r = searchByPrefix(VADEMECUM, 'amox');
    expect(r.map((m) => m.id)).toEqual(
      expect.arrayContaining(['med-amoxicilina', 'med-amoxicilina-clavulanico'])
    );
  });

  it('es insensible a acentos', () => {
    expect(searchByPrefix(VADEMECUM, 'ondansetron').length).toBeGreaterThan(0);
    expect(searchByPrefix(VADEMECUM, 'ÁCIDO').length).toBeGreaterThan(0);
  });

  it('no hace coincidencia en medio de palabra (solo prefijo)', () => {
    // "xicam" está dentro de "meloxicam" pero no es prefijo
    expect(searchByPrefix(VADEMECUM, 'xicam')).toHaveLength(0);
  });

  it('requiere que todas las palabras coincidan', () => {
    const r = searchByPrefix(VADEMECUM, 'pulgas pipeta');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((m) => m.therapeuticClass === 'Antiparasitario')).toBe(true);
  });

  it('prioriza coincidencias en nombre comercial', () => {
    const r = searchByPrefix(VADEMECUM, 'bravecto');
    expect(r[0].id).toBe('med-fluralaner');
  });

  it('filtra por especie', () => {
    const r = searchByPrefix(VADEMECUM, 'metimazol', 'Canino');
    expect(r).toHaveLength(0);
    expect(searchByPrefix(VADEMECUM, 'metimazol', 'Felino')).toHaveLength(1);
  });

  it('consulta vacía devuelve el catálogo (limitado)', () => {
    expect(searchByPrefix(VADEMECUM, '', undefined, 20)).toHaveLength(20);
  });
});
