import { Timestamp } from 'firebase/firestore';

export interface ActiveIngredient {
  name: string;
  concentration: string;
  unit: string;
}

export interface MedicationPresentation {
  id: string;
  form: string;
  concentration: string;
  volumeOrUnits?: string;
  route: string;
}

export interface Medication {
  id: string;
  commercialNames: string[];
  activeIngredients: ActiveIngredient[];
  therapeuticClass: string;
  pharmacologicalAction: string;
  targetSpecies: string[];
  indications: string[];
  contraindications: string[];
  searchKeywords: string[];
  presentations?: MedicationPresentation[];
  defaultDoseMgPerKg?: number;
  dosageNotes?: string;
  isControlled?: boolean;
  requiresPrescription?: boolean;
  isGlobal: boolean;
  createdBy: string;
  version: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
