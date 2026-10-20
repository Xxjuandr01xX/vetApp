import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Medication } from '@/lib/types/medication';
import { VADEMECUM } from '@/lib/data/vademecum';
import { searchByPrefix, normalizeText } from '@/lib/utils/medication-search';
import {
  customMedicationSchema,
  CustomMedicationFormData,
} from '@/lib/validations/medication';
import { cleanFirestoreData } from '@/lib/utils/firestore';
import {
  CACHE_KEYS,
  getCacheItem,
  setCacheItem,
  removeCacheItem,
} from '@/lib/utils/offline-cache';

const MEDICATIONS_COLLECTION = 'medications';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 lectura de Firestore por día (límite Spark)

let memoryCache: Promise<Medication[]> | null = null;

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

async function fetchRemoteGlobalMeds(): Promise<Medication[]> {
  // 1) Caché persistente en IndexedDB (fresca)
  const cached = await getCacheItem<Medication[]>(CACHE_KEYS.remoteGlobalMeds, {
    allowExpired: true,
  });

  if (cached && !cached.stale) {
    return cached.data;
  }

  // Si estamos offline y tenemos caché aunque esté vencida, usarla sin tocar red
  if (isBrowserOffline()) {
    return cached?.data ?? [];
  }

  try {
    // 2) Firestore (medicamentos globales agregados por el admin, adicionales al catálogo base)
    const q = query(
      collection(db, MEDICATIONS_COLLECTION),
      where('isGlobal', '==', true),
      limit(200)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => {
      const data = { ...d.data() };
      delete data.createdAt;
      delete data.updatedAt;
      return { ...data, id: d.id } as Medication;
    });

    await setCacheItem(CACHE_KEYS.remoteGlobalMeds, items, CACHE_TTL_MS);
    return items;
  } catch {
    return cached?.data ?? [];
  }
}

/** Medicamentos globales remotos, cacheados en memoria + IndexedDB. */
function getRemoteGlobalMeds(): Promise<Medication[]> {
  if (!memoryCache) {
    memoryCache = fetchRemoteGlobalMeds().catch((err) => {
      memoryCache = null;
      throw err;
    });
  }
  return memoryCache;
}

/**
 * Obtiene los medicamentos personalizados privados de un veterinario (RF-22)
 */
export async function getCustomMedications(vetId: string): Promise<Medication[]> {
  if (!vetId) return [];

  const cached = await getCacheItem<Medication[]>(
    CACHE_KEYS.customMedsByVet(vetId),
    { allowExpired: true }
  );

  if (isBrowserOffline()) {
    return cached?.data ?? [];
  }

  try {
    const q = query(
      collection(db, MEDICATIONS_COLLECTION),
      where('isGlobal', '==', false),
      where('createdBy', '==', vetId)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => {
      const data = { ...d.data() };
      delete data.createdAt;
      delete data.updatedAt;
      return { ...data, id: d.id } as Medication;
    });

    await setCacheItem(CACHE_KEYS.customMedsByVet(vetId), items, CACHE_TTL_MS);
    return items;
  } catch {
    return cached?.data ?? [];
  }
}

/**
 * Crea un medicamento personalizado para un veterinario Premium o Admin (RF-22)
 */
export async function createCustomMedication(
  vetId: string,
  rawData: CustomMedicationFormData,
  isPremiumOrAdmin: boolean
): Promise<{ success: boolean; medication?: Medication; error?: string }> {
  if (!isPremiumOrAdmin) {
    return {
      success: false,
      error: 'La creación de medicamentos personalizados es exclusiva del Plan Premium.',
    };
  }

  const parsed = customMedicationSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Datos del medicamento inválidos',
    };
  }

  const data = parsed.data;
  const keywordsSet = new Set<string>();
  [
    data.commercialName,
    data.activeIngredientName,
    data.therapeuticClass,
    ...data.commercialName.split(/\s+/),
    ...data.activeIngredientName.split(/\s+/),
  ]
    .map((w) => normalizeText(w))
    .filter((w) => w.length >= 2)
    .forEach((w) => keywordsSet.add(w));

  const newMedPayload = cleanFirestoreData({
    commercialNames: [data.commercialName],
    activeIngredients: [
      {
        name: data.activeIngredientName,
        concentration: data.concentration,
        unit: data.unit,
      },
    ],
    therapeuticClass: data.therapeuticClass,
    pharmacologicalAction: data.pharmacologicalAction || data.therapeuticClass,
    targetSpecies: data.targetSpecies,
    indications: data.indications
      ? data.indications
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : ['Uso clínico personalizado'],
    contraindications: data.contraindications
      ? data.contraindications
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    searchKeywords: Array.from(keywordsSet),
    presentations: [
      {
        id: 'pres-custom-1',
        form: data.presentationForm,
        concentration: `${data.concentration}${data.unit}`,
        route: data.route,
      },
    ],
    defaultDoseMgPerKg: data.defaultDoseMgPerKg,
    isGlobal: false,
    createdBy: vetId,
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    const docRef = await addDoc(collection(db, MEDICATIONS_COLLECTION), newMedPayload);
    const createdMed: Medication = {
      ...(newMedPayload as any),
      id: docRef.id,
    };
    delete (createdMed as any).createdAt;
    delete (createdMed as any).updatedAt;

    // Actualizar caché local de medicamentos personalizados
    const currentCustom = await getCustomMedications(vetId);
    await setCacheItem(
      CACHE_KEYS.customMedsByVet(vetId),
      [createdMed, ...currentCustom.filter((m) => m.id !== createdMed.id)],
      CACHE_TTL_MS
    );

    return { success: true, medication: createdMed };
  } catch (err: any) {
    console.error('Error al crear medicamento personalizado:', err);
    return {
      success: false,
      error: err?.message || 'No se pudo guardar el medicamento personalizado',
    };
  }
}

/**
 * Elimina un medicamento personalizado propio del veterinario
 */
export async function deleteCustomMedication(
  vetId: string,
  medId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, MEDICATIONS_COLLECTION, medId));
    const cached = await getCacheItem<Medication[]>(
      CACHE_KEYS.customMedsByVet(vetId),
      { allowExpired: true }
    );
    if (cached?.data) {
      await setCacheItem(
        CACHE_KEYS.customMedsByVet(vetId),
        cached.data.filter((m) => m.id !== medId),
        CACHE_TTL_MS
      );
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error al eliminar medicamento personalizado:', err);
    return { success: false, error: err?.message || 'Error al eliminar el medicamento' };
  }
}

/**
 * Catálogo completo: base local (100) + remotos globales + personalizados del veterinario (si se pasa vetId).
 */
export async function getFullCatalog(vetId?: string): Promise<Medication[]> {
  try {
    const [remote, custom] = await Promise.all([
      getRemoteGlobalMeds(),
      vetId ? getCustomMedications(vetId) : Promise.resolve([]),
    ]);

    const map = new Map<string, Medication>();
    custom.forEach((m) => map.set(m.id, m));
    VADEMECUM.forEach((m) => map.set(m.id, m));
    remote.forEach((m) => map.set(m.id, m));

    const merged = Array.from(map.values());
    await setCacheItem(CACHE_KEYS.vademecumCatalog, merged, CACHE_TTL_MS);
    return merged;
  } catch {
    const cachedCatalog = await getCacheItem<Medication[]>(CACHE_KEYS.vademecumCatalog, {
      allowExpired: true,
    });
    return cachedCatalog?.data ?? VADEMECUM;
  }
}

/**
 * Precarga el catálogo completo del Vademécum en IndexedDB al iniciar la PWA
 */
export async function warmupVademecumCache(): Promise<number> {
  const catalog = await getFullCatalog();
  return catalog.length;
}

/**
 * Buscar medicamentos por prefijo (nombre comercial, principio activo o palabra clave).
 * Insensible a acentos y mayúsculas.
 */
export async function searchMedications(
  searchTerm: string,
  species?: string,
  vetId?: string
): Promise<Medication[]> {
  const catalog = await getFullCatalog(vetId);
  return searchByPrefix(catalog, searchTerm, species);
}

/**
 * Obtener medicamento por ID
 */
export async function getMedicationById(
  id: string,
  vetId?: string
): Promise<Medication | null> {
  const catalog = await getFullCatalog(vetId);
  return catalog.find((m) => m.id === id) ?? null;
}

/** Forzar recarga del catálogo remoto (p. ej. tras edición del admin o nuevo med personalizado). */
export function invalidateMedicationCache(vetId?: string): void {
  memoryCache = null;
  removeCacheItem(CACHE_KEYS.remoteGlobalMeds).catch(() => {});
  removeCacheItem(CACHE_KEYS.vademecumCatalog).catch(() => {});
  if (vetId) {
    removeCacheItem(CACHE_KEYS.customMedsByVet(vetId)).catch(() => {});
  }
}
