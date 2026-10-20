import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { HistoryEvent } from '@/lib/types/treatment';
import { cleanFirestoreData } from '@/lib/utils/firestore';
import {
  CACHE_KEYS,
  getCacheItem,
  setCacheItem,
  removeCacheItem,
} from '@/lib/utils/offline-cache';

const HISTORY_COLLECTION = 'history';
const HISTORY_CACHE_TTL_MS = 2 * 60 * 1000; // 2 min caché activa para ahorrar lecturas Spark

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Registrar un evento inmutable en el historial clínico
 */
export async function addHistoryEvent(
  vetId: string,
  event: Omit<HistoryEvent, 'id' | 'createdAt' | 'vetId'>
): Promise<{ success: boolean; eventId?: string }> {
  try {
    let dateTimestamp: Timestamp;
    if (event.date instanceof Date) {
      dateTimestamp = Timestamp.fromDate(event.date);
    } else if (typeof event.date === 'string') {
      dateTimestamp = Timestamp.fromDate(new Date(event.date));
    } else {
      dateTimestamp = event.date;
    }

    const docData = cleanFirestoreData({
      ...event,
      vetId,
      date: dateTimestamp,
      createdAt: serverTimestamp(),
    });

    const docRef = await addDoc(collection(db, HISTORY_COLLECTION), docData);

    // Invalidar caché del historial de esta mascota para reflejar el nuevo evento al instante
    await removeCacheItem(CACHE_KEYS.historyByPet(event.petId));

    return { success: true, eventId: docRef.id };
  } catch (err) {
    console.error('Error registrando evento en historial:', err);
    return { success: false };
  }
}

/**
 * Obtener historial clínico cronológico de un paciente (con caché activa y respaldo offline en IndexedDB)
 */
export async function getPetHistory(
  petId: string,
  options?: { forceRefresh?: boolean }
): Promise<HistoryEvent[]> {
  const cached = await getCacheItem<HistoryEvent[]>(
    CACHE_KEYS.historyByPet(petId),
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
      collection(db, HISTORY_COLLECTION),
      where('petId', '==', petId)
    );

    const snap = await getDocs(q);
    const events = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as HistoryEvent[];

    // Ordenar cronológicamente descendente (el más reciente primero)
    const sorted = events.sort((a, b) => {
      const timeA =
        a.date instanceof Date
          ? a.date.getTime()
          : (a.date as any)?.toMillis
          ? (a.date as any).toMillis()
          : new Date(a.date as any).getTime();
      const timeB =
        b.date instanceof Date
          ? b.date.getTime()
          : (b.date as any)?.toMillis
          ? (b.date as any).toMillis()
          : new Date(b.date as any).getTime();
      return timeB - timeA;
    });

    await setCacheItem(CACHE_KEYS.historyByPet(petId), sorted, HISTORY_CACHE_TTL_MS);
    return sorted;
  } catch (err) {
    console.error('Error al obtener historial del paciente (usando caché offline):', err);
    return cached?.data ?? [];
  }
}
