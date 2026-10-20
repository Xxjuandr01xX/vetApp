import { get as idbGet, set as idbSet, del as idbDel, clear as idbClear } from 'idb-keyval';

export interface CacheEnvelope<T> {
  savedAt: number;
  ttlMs: number;
  payload: any;
}

export interface CacheResult<T> {
  data: T;
  stale: boolean;
  savedAt: number;
}

export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export const CACHE_KEYS = {
  vademecumCatalog: 'vetsaas:vademecum-catalog:v1',
  remoteGlobalMeds: 'vetsaas:remote-global-meds:v1',
  bcvRate: 'vetsaas:bcv-rate:v1',
  petsByVet: (vetId: string) => `vetsaas:pets:${vetId}`,
  petById: (petId: string) => `vetsaas:pet:${petId}`,
  appointmentsByVet: (vetId: string) => `vetsaas:appointments:${vetId}`,
  appointmentsByPet: (petId: string) => `vetsaas:appointments-pet:${petId}`,
  treatmentsByVet: (vetId: string) => `vetsaas:treatments:${vetId}`,
  treatmentsByPet: (petId: string) => `vetsaas:treatments-pet:${petId}`,
  historyByPet: (petId: string) => `vetsaas:history:${petId}`,
  customMedsByVet: (vetId: string) => `vetsaas:custom-meds:${vetId}`,
} as const;

// Almacenamiento en memoria de respaldo cuando IndexedDB no está disponible (SSR / Node / Tests)
const memoryFallbackStore = new Map<string, any>();

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * Serializa recursivamente valores incluyendo Date y Firestore Timestamp
 * para que puedan persistirse en IndexedDB sin perder métodos al restaurar.
 */
export function serializeForCache(value: any): any {
  if (value === null || value === undefined) return value;

  if (value instanceof Date) {
    return { __vetTsMs: value.getTime() };
  }

  // Firestore Timestamp (tiene toMillis o seconds/nanoseconds)
  if (typeof value === 'object' && typeof value.toMillis === 'function') {
    return { __vetTsMs: value.toMillis() };
  }

  if (
    typeof value === 'object' &&
    typeof value.seconds === 'number' &&
    typeof value.nanoseconds === 'number'
  ) {
    return { __vetTsMs: value.seconds * 1000 + Math.floor(value.nanoseconds / 1e6) };
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeForCache(item));
  }

  if (typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v !== 'function') {
        result[k] = serializeForCache(v);
      }
    }
    return result;
  }

  return value;
}

/**
 * Restaura objetos serializados devolviendo instancias Date compatibles con Firestore Timestamp (.toDate y .toMillis)
 */
export function deserializeFromCache<T = any>(value: any): T {
  if (value === null || value === undefined) return value;

  if (typeof value === 'object' && typeof value.__vetTsMs === 'number') {
    const ms = value.__vetTsMs;
    const d = new Date(ms) as Date & { toDate: () => Date; toMillis: () => number };
    Object.defineProperty(d, 'toDate', {
      value: () => new Date(ms),
      enumerable: false,
    });
    Object.defineProperty(d, 'toMillis', {
      value: () => ms,
      enumerable: false,
    });
    return d as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deserializeFromCache(item)) as unknown as T;
  }

  if (typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = deserializeFromCache(v);
    }
    return result as T;
  }

  return value as T;
}

/**
 * Guarda un elemento en IndexedDB (con respaldo en memoria)
 */
export async function setCacheItem<T>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<void> {
  const envelope: CacheEnvelope<T> = {
    savedAt: Date.now(),
    ttlMs,
    payload: serializeForCache(data),
  };

  memoryFallbackStore.set(key, envelope);

  if (hasIndexedDB()) {
    try {
      await idbSet(key, envelope);
    } catch {
      // Silenciar errores de cuota o modo incógnito restringido
    }
  }
}

/**
 * Obtiene un elemento de IndexedDB.
 * Por defecto permite retornar datos vencidos (stale: true) si allowExpired = true,
 * ideal para soporte offline-first.
 */
export async function getCacheItem<T>(
  key: string,
  options?: { allowExpired?: boolean }
): Promise<CacheResult<T> | null> {
  const allowExpired = options?.allowExpired ?? true;
  let envelope: CacheEnvelope<T> | undefined;

  if (hasIndexedDB()) {
    try {
      envelope = await idbGet<CacheEnvelope<T>>(key);
    } catch {
      // Caer al store en memoria
    }
  }

  if (!envelope) {
    envelope = memoryFallbackStore.get(key);
  }

  if (!envelope || typeof envelope.savedAt !== 'number') {
    return null;
  }

  const age = Date.now() - envelope.savedAt;
  const isStale = age > (envelope.ttlMs || DEFAULT_TTL_MS);

  if (isStale && !allowExpired) {
    return null;
  }

  return {
    data: deserializeFromCache<T>(envelope.payload),
    stale: isStale,
    savedAt: envelope.savedAt,
  };
}

/**
 * Elimina una clave de la caché IndexedDB y memoria
 */
export async function removeCacheItem(key: string): Promise<void> {
  memoryFallbackStore.delete(key);
  if (hasIndexedDB()) {
    try {
      await idbDel(key);
    } catch {
      // Ignorar
    }
  }
}

/**
 * Limpia toda la caché offline
 */
export async function clearOfflineCache(): Promise<void> {
  memoryFallbackStore.clear();
  if (hasIndexedDB()) {
    try {
      await idbClear();
    } catch {
      // Ignorar
    }
  }
}
