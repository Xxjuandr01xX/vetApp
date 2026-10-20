import { Timestamp } from 'firebase/firestore';

export type Species = 'Canino' | 'Felino' | 'Equino' | 'Ave' | 'Exótico' | 'Otro';
export type PetSex = 'M' | 'F';
export type PetStatus = 'active' | 'inactive' | 'deceased';

export interface PetOwner {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface Pet {
  id: string;
  vetId: string;
  name: string;
  species: Species;
  breed?: string;
  sex: PetSex;
  neutered: boolean;
  birthDate?: Timestamp | Date | null;
  weightKg?: number;
  color?: string;
  microchip?: string;
  photoUrl?: string;
  owner: PetOwner;
  allergies: string[];
  chronicConditions: string[];
  notes?: string;
  status: PetStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type PetCreateInput = Omit<Pet, 'id' | 'createdAt' | 'updatedAt' | 'vetId'>;
export type PetUpdateInput = Partial<PetCreateInput>;
