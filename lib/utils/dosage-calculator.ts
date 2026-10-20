import { Medication } from '@/lib/types/medication';

export type DoseUnitType = 'ml' | 'comprimido' | 'capsula' | 'tableta' | 'gota' | 'unidad';

export interface DosageCalculationInput {
  weightKg: number;
  doseMgPerKg: number;
  concentrationMgPerUnit: number;
  unitType?: DoseUnitType;
}

export interface DosageCalculationResult {
  weightKg: number;
  doseMgPerKg: number;
  concentrationMgPerUnit: number;
  totalMg: number;
  unitsToAdminister: number;
  unitLabel: string;
  formattedDose: string;
}

/**
 * Tabla de referencia clínica de dosis estándar (mg/kg) por principio activo común
 */
const REFERENCE_MG_PER_KG: Record<string, number> = {
  amoxicilina: 12.5,
  cefalexina: 22,
  cefovecina: 8,
  ceftriaxona: 25,
  enrofloxacina: 5,
  marbofloxacina: 2,
  doxiciclina: 10,
  metronidazol: 15,
  azitromicina: 10,
  clindamicina: 11,
  gentamicina: 6,
  meloxicam: 0.1,
  carprofeno: 2.2,
  ketoprofeno: 1,
  firocoxib: 5,
  robenacoxib: 1,
  prednisolona: 0.5,
  dexametasona: 0.1,
  tramadol: 3,
  gabapentina: 10,
  buprenorfina: 0.02,
  furosemida: 2,
  pimobendan: 0.25,
  enalapril: 0.5,
  benazepril: 0.5,
  amlodipino: 0.1,
  omeprazol: 1,
  famotidina: 0.5,
  maropitant: 1,
  metoclopramida: 0.4,
  ondansetron: 0.5,
  ivermectina: 0.2,
  fenbendazol: 50,
  praziquantel: 5,
  pirantel: 5,
  fenobarbital: 2.5,
  levetiracetam: 20,
  ciclosporina: 5,
  oclacitinib: 0.4,
};

function roundTo2(num: number): number {
  return Number(Math.round(Number(`${num}e2`)) + 'e-2');
}

/**
 * Extrae concentración numérica y tipo de unidad a partir de textos como "50mg/ml", "250mg", "1.5 mg/ml"
 */
export function parsePresentationConcentration(
  concentrationText: string,
  formText: string = ''
): { concentrationMgPerUnit: number; unitType: DoseUnitType } {
  const cleanConc = (concentrationText || '').toLowerCase().replace(',', '.');
  const cleanForm = (formText || '').toLowerCase();

  // Buscar primer número decimal o entero
  const match = cleanConc.match(/(\d+(\.\d+)?)/);
  const value = match ? parseFloat(match[1]) : 0;

  let unitType: DoseUnitType = 'unidad';
  if (
    cleanConc.includes('/ml') ||
    cleanForm.includes('suspension') ||
    cleanForm.includes('suspensión') ||
    cleanForm.includes('inyectable') ||
    cleanForm.includes('jarabe') ||
    cleanForm.includes('solucion') ||
    cleanForm.includes('solución')
  ) {
    unitType = 'ml';
  } else if (cleanForm.includes('capsula') || cleanForm.includes('cápsula')) {
    unitType = 'capsula';
  } else if (cleanForm.includes('tableta')) {
    unitType = 'tableta';
  } else if (cleanForm.includes('gota')) {
    unitType = 'gota';
  } else if (cleanForm.includes('comprimido') || cleanConc.endsWith('mg')) {
    unitType = 'comprimido';
  }

  return {
    concentrationMgPerUnit: value > 0 ? value : 1,
    unitType,
  };
}

/**
 * Obtiene la dosis sugerida en mg/kg para un medicamento según su configuración o principio activo
 */
export function getSuggestedDoseMgPerKg(med: Medication): number {
  if (med.defaultDoseMgPerKg && med.defaultDoseMgPerKg > 0) {
    return med.defaultDoseMgPerKg;
  }

  for (const ing of med.activeIngredients || []) {
    const normalized = ing.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    for (const [key, doseVal] of Object.entries(REFERENCE_MG_PER_KG)) {
      if (normalized.includes(key)) {
        return doseVal;
      }
    }
  }

  return 10; // Valor base por defecto (10 mg/kg) editable por el médico
}

function formatUnitPlural(amount: number, unitType: DoseUnitType): string {
  if (unitType === 'ml') return 'ml';
  const isPlural = amount !== 1;
  switch (unitType) {
    case 'comprimido':
      return isPlural ? 'comprimidos' : 'comprimido';
    case 'capsula':
      return isPlural ? 'cápsulas' : 'cápsula';
    case 'tableta':
      return isPlural ? 'tabletas' : 'tableta';
    case 'gota':
      return isPlural ? 'gotas' : 'gota';
    default:
      return isPlural ? 'unidades' : 'unidad';
  }
}

/**
 * Calcula la dosis exacta por peso del paciente (mg totales y volumen/unidades a administrar)
 */
export function calculateDoseByWeight(
  input: DosageCalculationInput
): DosageCalculationResult {
  const { weightKg, doseMgPerKg, concentrationMgPerUnit, unitType = 'ml' } = input;

  if (weightKg <= 0 || doseMgPerKg <= 0 || concentrationMgPerUnit <= 0) {
    throw new Error('El peso, la dosis (mg/kg) y la concentración deben ser mayores a 0');
  }

  const totalMg = roundTo2(weightKg * doseMgPerKg);
  const unitsToAdminister = roundTo2(totalMg / concentrationMgPerUnit);
  const unitLabel = formatUnitPlural(unitsToAdminister, unitType);

  const formattedDose = `${unitsToAdminister} ${unitLabel} (${totalMg} mg totales — ${doseMgPerKg} mg/kg)`;

  return {
    weightKg,
    doseMgPerKg,
    concentrationMgPerUnit,
    totalMg,
    unitsToAdminister,
    unitLabel,
    formattedDose,
  };
}
