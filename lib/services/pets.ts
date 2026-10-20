import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Pet, PetCreateInput, PetUpdateInput } from '@/lib/types/pet';
import { PLAN_LIMITS } from '@/lib/constants';
import { cleanFirestoreData } from '@/lib/utils/firestore';
import {
  CACHE_KEYS,
  getCacheItem,
  setCacheItem,
  removeCacheItem,
} from '@/lib/utils/offline-cache';

const PETS_COLLECTION = 'pets';
const PETS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 min caché activa para minimizar lecturas en plan Spark

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function filterAndSortPets(
  allPets: Pet[],
  options?: {
    status?: 'active' | 'inactive' | 'deceased';
    limitCount?: number;
  }
): Pet[] {
  let pets = [...allPets];

  if (options?.status) {
    pets = pets.filter((p) => p.status === options.status);
  }

  pets.sort((a, b) => {
    const timeA = a.updatedAt?.toMillis
      ? a.updatedAt.toMillis()
      : a.updatedAt instanceof Date
      ? a.updatedAt.getTime()
      : 0;
    const timeB = b.updatedAt?.toMillis
      ? b.updatedAt.toMillis()
      : b.updatedAt instanceof Date
      ? b.updatedAt.getTime()
      : 0;
    return timeB - timeA;
  });

  if (options?.limitCount) {
    pets = pets.slice(0, options.limitCount);
  }

  return pets;
}

/**
 * Obtener cantidad total de pacientes de un veterinario
 */
export async function getPetsCount(vetId: string): Promise<number> {
  const cached = await getCacheItem<Pet[]>(CACHE_KEYS.petsByVet(vetId), {
    allowExpired: true,
  });

  if (isBrowserOffline()) {
    return cached?.data.length ?? 0;
  }

  if (cached && !cached.stale) {
    return cached.data.length;
  }

  try {
    const q = query(
      collection(db, PETS_COLLECTION),
      where('vetId', '==', vetId)
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch {
    return cached?.data.length ?? 0;
  }
}

/**
 * Obtener lista de pacientes de un veterinario (con caché activa y respaldo offline en IndexedDB)
 */
export async function getPets(
  vetId: string,
  options?: {
    status?: 'active' | 'inactive' | 'deceased';
    limitCount?: number;
    forceRefresh?: boolean;
  }
): Promise<Pet[]> {
  const cached = await getCacheItem<Pet[]>(CACHE_KEYS.petsByVet(vetId), {
    allowExpired: true,
  });

  if (isBrowserOffline()) {
    return filterAndSortPets(cached?.data ?? [], options);
  }

  if (cached && !cached.stale && !options?.forceRefresh) {
    return filterAndSortPets(cached.data, options);
  }

  try {
    const q = query(
      collection(db, PETS_COLLECTION),
      where('vetId', '==', vetId)
    );

    const snap = await getDocs(q);
    const allPets = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Pet[];

    // Guardar en caché IndexedDB para uso rápido y offline
    await setCacheItem(CACHE_KEYS.petsByVet(vetId), allPets, PETS_CACHE_TTL_MS);
    for (const pet of allPets) {
      setCacheItem(CACHE_KEYS.petById(pet.id), pet, PETS_CACHE_TTL_MS).catch(() => {});
    }

    return filterAndSortPets(allPets, options);
  } catch (err) {
    console.error('Error al obtener lista de pacientes (usando caché offline):', err);
    return filterAndSortPets(cached?.data ?? [], options);
  }
}

/**
 * Obtener un paciente por ID (con caché activa y respaldo offline en IndexedDB)
 */
export async function getPetById(
  petId: string,
  options?: { forceRefresh?: boolean }
): Promise<Pet | null> {
  const cached = await getCacheItem<Pet>(CACHE_KEYS.petById(petId), {
    allowExpired: true,
  });

  if (isBrowserOffline()) {
    return cached?.data ?? null;
  }

  if (cached && !cached.stale && !options?.forceRefresh) {
    return cached.data;
  }

  try {
    const docRef = doc(db, PETS_COLLECTION, petId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const pet = { id: snap.id, ...snap.data() } as Pet;
    await setCacheItem(CACHE_KEYS.petById(petId), pet, PETS_CACHE_TTL_MS);
    return pet;
  } catch {
    return cached?.data ?? null;
  }
}

/**
 * Crear un nuevo paciente con validación de límite de plan
 */
export async function createPet(
  vetId: string,
  data: PetCreateInput,
  isFreePlan: boolean
): Promise<{ success: boolean; petId?: string; error?: string }> {
  try {
    if (isFreePlan) {
      const currentCount = await getPetsCount(vetId);
      if (currentCount >= PLAN_LIMITS.FREE_PATIENT_LIMIT) {
        return {
          success: false,
          error: `Has alcanzado el límite de ${PLAN_LIMITS.FREE_PATIENT_LIMIT} pacientes para el plan Gratuito. Pasa a Premium para pacientes ilimitados.`,
        };
      }
    }

    let birthDateTimestamp: Timestamp | null = null;
    if (data.birthDate) {
      if (data.birthDate instanceof Date) {
        birthDateTimestamp = Timestamp.fromDate(data.birthDate);
      } else if (typeof data.birthDate === 'string' && data.birthDate) {
        birthDateTimestamp = Timestamp.fromDate(new Date(data.birthDate));
      }
    }

    const docData = cleanFirestoreData({
      ...data,
      vetId,
      birthDate: birthDateTimestamp,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const docRef = await addDoc(collection(db, PETS_COLLECTION), docData);
    await removeCacheItem(CACHE_KEYS.petsByVet(vetId));

    return { success: true, petId: docRef.id };
  } catch (err: any) {
    console.error('Error al crear paciente:', err);
    return { success: false, error: err?.message || 'Error al guardar el paciente' };
  }
}

/**
 * Actualizar datos de un paciente
 */
export async function updatePet(
  petId: string,
  data: PetUpdateInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, PETS_COLLECTION, petId);

    let birthDateTimestamp = undefined;
    if (data.birthDate !== undefined) {
      if (data.birthDate instanceof Date) {
        birthDateTimestamp = Timestamp.fromDate(data.birthDate);
      } else if (typeof data.birthDate === 'string' && data.birthDate) {
        birthDateTimestamp = Timestamp.fromDate(new Date(data.birthDate));
      } else {
        birthDateTimestamp = null;
      }
    }

    const updateData: Record<string, any> = cleanFirestoreData({
      ...data,
      updatedAt: serverTimestamp(),
    });

    if (birthDateTimestamp !== undefined) {
      updateData.birthDate = birthDateTimestamp;
    }

    await updateDoc(docRef, updateData);

    // Invalidar caché individual y de lista del veterinario si se conoce
    const existingCached = await getCacheItem<Pet>(CACHE_KEYS.petById(petId), {
      allowExpired: true,
    });
    await removeCacheItem(CACHE_KEYS.petById(petId));
    if (existingCached?.data?.vetId) {
      await removeCacheItem(CACHE_KEYS.petsByVet(existingCached.data.vetId));
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al actualizar paciente:', err);
    return { success: false, error: err?.message || 'Error al actualizar el paciente' };
  }
}

/**
 * Eliminar un paciente
 */
export async function deletePet(petId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const existingCached = await getCacheItem<Pet>(CACHE_KEYS.petById(petId), {
      allowExpired: true,
    });

    const docRef = doc(db, PETS_COLLECTION, petId);
    await deleteDoc(docRef);
    await removeCacheItem(CACHE_KEYS.petById(petId));
    if (existingCached?.data?.vetId) {
      await removeCacheItem(CACHE_KEYS.petsByVet(existingCached.data.vetId));
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al eliminar paciente:', err);
    return { success: false, error: err?.message || 'Error al eliminar el paciente' };
  }
}
