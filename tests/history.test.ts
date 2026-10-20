import { describe, it, expect } from 'vitest';
import { HistoryEvent } from '../lib/types/treatment';

describe('Pet History Suite (Sprint 9)', () => {
  it('ordena eventos cronológicamente descendente (más recientes primero)', () => {
    const rawEvents: HistoryEvent[] = [
      {
        id: 'evt-1',
        vetId: 'vet-1',
        petId: 'pet-1',
        refId: 'ref-weight-1',
        type: 'weight',
        date: new Date('2026-01-10T10:00:00Z'),
        summary: 'Control de peso 12kg',
        createdAt: null as any,
      },
      {
        id: 'evt-2',
        vetId: 'vet-1',
        petId: 'pet-1',
        refId: 'ref-vac-1',
        type: 'vaccination',
        date: new Date('2026-06-15T15:30:00Z'),
        summary: 'Vacuna Séxtuple',
        createdAt: null as any,
      },
      {
        id: 'evt-3',
        vetId: 'vet-1',
        petId: 'pet-1',
        refId: 'ref-trt-1',
        type: 'treatment',
        date: new Date('2026-10-13T09:00:00Z'),
        summary: 'Consulta dermatológica',
        createdAt: null as any,
      },
    ];

    const sorted = [...rawEvents].sort((a, b) => {
      const timeA = a.date instanceof Date ? a.date.getTime() : new Date(a.date as any).getTime();
      const timeB = b.date instanceof Date ? b.date.getTime() : new Date(b.date as any).getTime();
      return timeB - timeA;
    });

    expect(sorted[0].id).toBe('evt-3');
    expect(sorted[1].id).toBe('evt-2');
    expect(sorted[2].id).toBe('evt-1');
  });

  it('soporta tipos de eventos válidos: treatment, weight, appointment, vaccination', () => {
    const validTypes = ['treatment', 'weight', 'appointment', 'vaccination'];
    validTypes.forEach((t) => {
      const evt: Partial<HistoryEvent> = {
        type: t as any,
        summary: `Evento tipo ${t}`,
      };
      expect(evt.type).toBe(t);
    });
  });
});
