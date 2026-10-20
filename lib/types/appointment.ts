import { Timestamp } from 'firebase/firestore';
import { ServicePrice } from './treatment';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  vetId: string;
  petId: string;
  petName?: string;
  petSpecies?: string;
  ownerName?: string;
  ownerPhone?: string;
  date: Timestamp | Date;
  durationMin: number;
  reason: string;
  status: AppointmentStatus;
  notes?: string;
  servicePrice?: ServicePrice;
  createdAt: Timestamp;
}

export type AppointmentCreateInput = Omit<Appointment, 'id' | 'createdAt' | 'vetId'>;
export type AppointmentUpdateInput = Partial<AppointmentCreateInput>;
