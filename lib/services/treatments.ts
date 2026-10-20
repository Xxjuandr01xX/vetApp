import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Treatment, TreatmentCreateInput } from '@/lib/types/treatment';
import { addHistoryEvent } from '@/lib/services/history';
import { updatePet } from '@/lib/services/pets';
import { cleanFirestoreData } from '@/lib/utils/firestore';
import {
  CACHE_KEYS,
  getCacheItem,
  setCacheItem,
  removeCacheItem,
} from '@/lib/utils/offline-cache';

const TREATMENTS_COLLECTION = 'treatments';
const TREATMENTS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 min caché activa para ahorrar lecturas Spark

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function sortTreatmentsDesc(items: Treatment[], limitCount?: number): Treatment[] {
  const sorted = [...items].sort((a, b) => {
    const timeA =
      a.createdAt instanceof Date
        ? a.createdAt.getTime()
        : (a.createdAt as any)?.toMillis
        ? (a.createdAt as any).toMillis()
        : 0;
    const timeB =
      b.createdAt instanceof Date
        ? b.createdAt.getTime()
        : (b.createdAt as any)?.toMillis
        ? (b.createdAt as any).toMillis()
        : 0;
    return timeB - timeA;
  });

  return limitCount ? sorted.slice(0, limitCount) : sorted;
}

/**
 * Registrar un nuevo tratamiento clínico
 */
export async function createTreatment(
  vetId: string,
  data: TreatmentCreateInput
): Promise<{ success: boolean; treatmentId?: string; error?: string }> {
  try {
    const docData = cleanFirestoreData({
      ...data,
      vetId,
      createdAt: serverTimestamp(),
    });

    const docRef = await addDoc(collection(db, TREATMENTS_COLLECTION), docData);

    // Invalidar cachés de tratamientos
    await removeCacheItem(CACHE_KEYS.treatmentsByVet(vetId));
    await removeCacheItem(CACHE_KEYS.treatmentsByPet(data.petId));

    // 1. Registrar automáticamente en el historial clínico inmutable
    const medSummary =
      data.medications.length > 0
        ? ` • Recetados: ${data.medications.map((m) => m.commercialName).join(', ')}`
        : '';

    await addHistoryEvent(vetId, {
      petId: data.petId,
      type: 'treatment',
      refId: docRef.id,
      summary: `Tratamiento: ${data.diagnosis}${medSummary}`,
      date: new Date(),
    });

    // 2. Si se registró nuevo peso, actualizar peso del paciente
    if (data.weightAtVisit) {
      await updatePet(data.petId, { weightKg: data.weightAtVisit });
      await addHistoryEvent(vetId, {
        petId: data.petId,
        type: 'weight',
        refId: docRef.id,
        summary: `Control de peso: ${data.weightAtVisit} kg`,
        date: new Date(),
      });
    }

    return { success: true, treatmentId: docRef.id };
  } catch (err: any) {
    console.error('Error al registrar tratamiento:', err);
    return { success: false, error: err?.message || 'Error al guardar el tratamiento' };
  }
}

/**
 * Obtener todos los tratamientos de un paciente (con caché activa y respaldo offline en IndexedDB)
 */
export async function getTreatmentsByPet(
  petId: string,
  options?: { forceRefresh?: boolean }
): Promise<Treatment[]> {
  const cached = await getCacheItem<Treatment[]>(
    CACHE_KEYS.treatmentsByPet(petId),
    { allowExpired: true }
  );

  if (isBrowserOffline()) {
    return cached?.data ?? [];
  }

  if (cached && !cached.stale && !options?.forceRefresh) {
    return cached.data;
  }

  try {
    const q = query(
      collection(db, TREATMENTS_COLLECTION),
      where('petId', '==', petId)
    );

    const snap = await getDocs(q);
    const treatments = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Treatment[];

    const sorted = sortTreatmentsDesc(treatments);
    await setCacheItem(
      CACHE_KEYS.treatmentsByPet(petId),
      sorted,
      TREATMENTS_CACHE_TTL_MS
    );
    return sorted;
  } catch (err) {
    console.error('Error al obtener tratamientos del paciente (usando caché offline):', err);
    return cached?.data ?? [];
  }
}

/**
 * Obtener lista general de tratamientos de un veterinario (con caché activa y respaldo offline en IndexedDB)
 */
export async function getTreatments(
  vetId: string,
  options?: { limitCount?: number; forceRefresh?: boolean }
): Promise<Treatment[]> {
  const cached = await getCacheItem<Treatment[]>(
    CACHE_KEYS.treatmentsByVet(vetId),
    { allowExpired: true }
  );

  if (isBrowserOffline()) {
    return sortTreatmentsDesc(cached?.data ?? [], options?.limitCount);
  }

  if (cached && !cached.stale && !options?.forceRefresh) {
    return sortTreatmentsDesc(cached.data, options?.limitCount);
  }

  try {
    const q = query(
      collection(db, TREATMENTS_COLLECTION),
      where('vetId', '==', vetId)
    );

    const snap = await getDocs(q);
    const allTreatments = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Treatment[];

    await setCacheItem(
      CACHE_KEYS.treatmentsByVet(vetId),
      allTreatments,
      TREATMENTS_CACHE_TTL_MS
    );
    return sortTreatmentsDesc(allTreatments, options?.limitCount);
  } catch (err) {
    console.error('Error al obtener tratamientos (usando caché offline):', err);
    return sortTreatmentsDesc(cached?.data ?? [], options?.limitCount);
  }
}

/**
 * Obtener conteo de tratamientos de un veterinario
 */
export async function getTreatmentsCount(vetId: string): Promise<number> {
  const list = await getTreatments(vetId);
  return list.length;
}

/**
 * Obtener tratamiento por ID
 */
export async function getTreatmentById(treatmentId: string): Promise<Treatment | null> {
  const docRef = doc(db, TREATMENTS_COLLECTION, treatmentId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Treatment;
}

/**
 * Eliminar tratamiento
 */
export async function deleteTreatment(
  treatmentId: string,
  vetId?: string,
  petId?: string
): Promise<{ success: boolean }> {
  try {
    const docRef = doc(db, TREATMENTS_COLLECTION, treatmentId);
    await deleteDoc(docRef);
    if (vetId) await removeCacheItem(CACHE_KEYS.treatmentsByVet(vetId));
    if (petId) await removeCacheItem(CACHE_KEYS.treatmentsByPet(petId));
    return { success: true };
  } catch (err) {
    console.error('Error al eliminar tratamiento:', err);
    return { success: false };
  }
}
