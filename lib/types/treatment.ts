import { Timestamp } from 'firebase/firestore';

export interface TreatmentMedication {
  medicationId: string;
  activeIngredient: string;
  commercialName: string;
  presentationId?: string;
  dose: string;
  route: string;
  frequency: string;
  durationDays: number;
  calculatedDose?: string;
  notes?: string;
}

export interface ServicePrice {
  amountUSD: number;
  amountVES: number;
  rateUsed: number;
  rateDate: string;
  rateSource: string;
  currency: 'USD' | 'EUR';
  isManualRate: boolean;
}

export interface Treatment {
  id: string;
  vetId: string;
  petId: string;
  petName?: string;
  appointmentId?: string | null;
  diagnosis: string;
  weightAtVisit?: number;
  medications: TreatmentMedication[];
  procedures: string[];
  recommendations?: string;
  servicePrice?: ServicePrice;
  createdAt: Timestamp | Date;
}

export type TreatmentCreateInput = Omit<Treatment, 'id' | 'createdAt' | 'vetId'>;

export interface HistoryEvent {
  id: string;
  vetId: string;
  petId: string;
  type: 'treatment' | 'appointment' | 'vaccination' | 'weight' | 'note' | 'file';
  refId: string;
  summary: string;
  date: Timestamp | Date;
  createdAt: Timestamp;
}
