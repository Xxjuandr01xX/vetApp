import { Medication } from '@/lib/types/medication';
import { INITIAL_MEDICATIONS } from './initial-medications';
import { EXTRA_MEDICATIONS } from './vademecum-extra';

/** Catálogo global completo (100 medicamentos) — se sirve desde el bundle, sin lecturas a Firestore. */
export const VADEMECUM: Medication[] = (() => {
  const map = new Map<string, Medication>();
  [...INITIAL_MEDICATIONS, ...EXTRA_MEDICATIONS].forEach((m) => map.set(m.id, m));
  return Array.from(map.values());
})();
