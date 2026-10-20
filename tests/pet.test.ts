import { describe, it, expect } from 'vitest';
import { petSchema } from '../lib/validations/pet';
import { PLAN_LIMITS } from '../lib/constants';

describe('Pet Validation Schema', () => {
  it('validates a complete valid pet registration', () => {
    const validPet = {
      name: 'Max',
      species: 'Canino',
      breed: 'Pastor Alemán',
      sex: 'M',
      neutered: true,
      birthDate: '2022-04-10',
      weightKg: 28.5,
      color: 'Negro y fuego',
      owner: {
        name: 'Carlos Mendoza',
        phone: '0414-1234567',
        email: 'carlos@ejemplo.com',
        address: 'Caracas',
      },
      allergies: ['Pollo'],
      chronicConditions: ['Displasia leve'],
      status: 'active',
    };

    const result = petSchema.safeParse(validPet);
    expect(result.success).toBe(true);
  });

  it('fails when name is missing', () => {
    const invalid = {
      name: '',
      species: 'Felino',
      sex: 'F',
      owner: {
        name: 'Laura',
        phone: '0412-9876543',
      },
    };
    const result = petSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('fails when species is invalid', () => {
    const invalid = {
      name: 'Michi',
      species: 'Dragon', // invalid species
      sex: 'F',
      owner: {
        name: 'Laura',
        phone: '0412-9876543',
      },
    };
    const result = petSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('fails when owner phone is missing', () => {
    const invalid = {
      name: 'Pelusa',
      species: 'Felino',
      sex: 'M',
      owner: {
        name: 'Pedro',
        phone: '',
      },
    };
    const result = petSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects negative or impossible weight values', () => {
    const invalid = {
      name: 'Rex',
      species: 'Canino',
      sex: 'M',
      weightKg: -5,
      owner: {
        name: 'Pedro',
        phone: '0414-5555555',
      },
    };
    const result = petSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('verifies default plan limit is 30 patients', () => {
    expect(PLAN_LIMITS.FREE_PATIENT_LIMIT).toBe(30);
  });
});
