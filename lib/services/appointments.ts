import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import {
  Appointment,
  AppointmentCreateInput,
  AppointmentStatus,
} from '@/lib/types/appointment';
import { addHistoryEvent } from '@/lib/services/history';
import { startOfDay, endOfDay } from 'date-fns';
import { cleanFirestoreData } from '@/lib/utils/firestore';
import {
  CACHE_KEYS,
  getCacheItem,
  setCacheItem,
  removeCacheItem,
} from '@/lib/utils/offline-cache';

const APPOINTMENTS_COLLECTION = 'appointments';
const APPOINTMENTS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 min caché activa para ahorrar lecturas Spark

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function filterAndSortAppointments(
  allAppointments: Appointment[],
  options?: {
    startDate?: Date;
    endDate?: Date;
    status?: AppointmentStatus;
    limitCount?: number;
  }
): Appointment[] {
  let appointments = [...allAppointments];

  if (options?.startDate || options?.endDate) {
    appointments = appointments.filter((a) => {
      const time =
        a.date instanceof Date
          ? a.date.getTime()
          : (a.date as any)?.toMillis
          ? (a.date as any).toMillis()
          : new Date(a.date as any).getTime();

      if (options.startDate && time < options.startDate.getTime()) return false;
      if (options.endDate && time > options.endDate.getTime()) return false;
      return true;
    });
  }

  if (options?.status) {
    appointments = appointments.filter((a) => a.status === options.status);
  }

  appointments.sort((a, b) => {
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
    return timeA - timeB;
  });

  if (options?.limitCount) {
    appointments = appointments.slice(0, options.limitCount);
  }

  return appointments;
}

/**
 * Obtener citas de un veterinario dentro de un rango de fechas (con caché activa y respaldo offline en IndexedDB)
 */
export async function getAppointments(
  vetId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    status?: AppointmentStatus;
    limitCount?: number;
    forceRefresh?: boolean;
  }
): Promise<Appointment[]> {
  const cached = await getCacheItem<Appointment[]>(
    CACHE_KEYS.appointmentsByVet(vetId),
    { allowExpired: true }
  );

  if (isBrowserOffline()) {
    return filterAndSortAppointments(cached?.data ?? [], options);
  }

  if (cached && !cached.stale && !options?.forceRefresh) {
    return filterAndSortAppointments(cached.data, options);
  }

  try {
    const q = query(
      collection(db, APPOINTMENTS_COLLECTION),
      where('vetId', '==', vetId)
    );
    const snap = await getDocs(q);

    const allAppointments = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Appointment[];

    await setCacheItem(
      CACHE_KEYS.appointmentsByVet(vetId),
      allAppointments,
      APPOINTMENTS_CACHE_TTL_MS
    );

    return filterAndSortAppointments(allAppointments, options);
  } catch (err) {
    console.error('Error al obtener citas (usando caché offline):', err);
    return filterAndSortAppointments(cached?.data ?? [], options);
  }
}

/**
 * Obtener citas del día actual (para agenda y dashboard)
 */
export async function getTodayAppointments(vetId: string): Promise<Appointment[]> {
  const now = new Date();
  const start = startOfDay(now);
  const end = endOfDay(now);
  return getAppointments(vetId, { startDate: start, endDate: end });
}

/**
 * Conteo de citas para hoy
 */
export async function getTodayAppointmentsCount(vetId: string): Promise<number> {
  const appointments = await getTodayAppointments(vetId);
  return appointments.length;
}

/**
 * Obtener historial de citas de un paciente específico (con caché activa y respaldo offline en IndexedDB)
 */
export async function getAppointmentsByPet(
  petId: string,
  options?: { forceRefresh?: boolean }
): Promise<Appointment[]> {
  const cached = await getCacheItem<Appointment[]>(
    CACHE_KEYS.appointmentsByPet(petId),
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
      collection(db, APPOINTMENTS_COLLECTION),
      where('petId', '==', petId)
    );

    const snap = await getDocs(q);
    const appointments = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Appointment[];

    const sorted = appointments.sort((a, b) => {
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

    await setCacheItem(
      CACHE_KEYS.appointmentsByPet(petId),
      sorted,
      APPOINTMENTS_CACHE_TTL_MS
    );
    return sorted;
  } catch (err) {
    console.error('Error al obtener citas del paciente (usando caché offline):', err);
    return cached?.data ?? [];
  }
}

/**
 * Crear una nueva cita y registrar evento en el historial clínico inmutable (RF-17)
 */
export async function createAppointment(
  vetId: string,
  data: AppointmentCreateInput
): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
  try {
    let dateTimestamp: Timestamp;
    let dateObj: Date;
    if (data.date instanceof Date) {
      dateObj = data.date;
      dateTimestamp = Timestamp.fromDate(data.date);
    } else if (typeof data.date === 'string') {
      dateObj = new Date(data.date);
      dateTimestamp = Timestamp.fromDate(dateObj);
    } else {
      dateTimestamp = data.date;
      dateObj = data.date?.toDate ? data.date.toDate() : new Date();
    }

    const docData = cleanFirestoreData({
      ...data,
      vetId,
      date: dateTimestamp,
      createdAt: serverTimestamp(),
    });

    const docRef = await addDoc(collection(db, APPOINTMENTS_COLLECTION), docData);

    // Invalidar cachés de citas
    await removeCacheItem(CACHE_KEYS.appointmentsByVet(vetId));
    if (data.petId) {
      await removeCacheItem(CACHE_KEYS.appointmentsByPet(data.petId));
      // Registrar evento inmutable en el historial clínico
      await addHistoryEvent(vetId, {
        petId: data.petId,
        type: 'appointment',
        refId: docRef.id,
        summary: `Cita agendada: ${data.reason} (${data.durationMin} min)`,
        date: dateObj,
      });
    }

    return { success: true, appointmentId: docRef.id };
  } catch (err: any) {
    console.error('Error al crear cita:', err);
    return { success: false, error: err?.message || 'Error al agendar cita' };
  }
}

/**
 * Cambiar el estado de una cita (scheduled, completed, cancelled, no_show)
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  vetId?: string,
  petId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    await updateDoc(docRef, { status });

    if (vetId) await removeCacheItem(CACHE_KEYS.appointmentsByVet(vetId));
    if (petId) await removeCacheItem(CACHE_KEYS.appointmentsByPet(petId));

    return { success: true };
  } catch (err: any) {
    console.error('Error al cambiar estado de cita:', err);
    return { success: false, error: err?.message || 'Error al actualizar cita' };
  }
}

/**
 * Eliminar una cita
 */
export async function deleteAppointment(
  appointmentId: string,
  vetId?: string,
  petId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    await deleteDoc(docRef);

    if (vetId) await removeCacheItem(CACHE_KEYS.appointmentsByVet(vetId));
    if (petId) await removeCacheItem(CACHE_KEYS.appointmentsByPet(petId));

    return { success: true };
  } catch (err: any) {
    console.error('Error al eliminar cita:', err);
    return { success: false, error: err?.message || 'Error al eliminar cita' };
  }
}
