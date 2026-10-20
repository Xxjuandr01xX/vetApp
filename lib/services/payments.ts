import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { API } from '@/lib/constants';
import {
  PaymentRequest,
  PaymentStatus,
} from '@/lib/types/payment';
import {
  PaymentRequestInput,
  PaymentRejectInput,
} from '@/lib/validations/payment';
import { getStoredAdminPin } from '@/lib/services/admin-panel';

const COLLECTION = 'payment_requests';

/**
 * Enviar solicitud de pago al backend
 */
export async function submitPaymentRequest(
  data: PaymentRequestInput,
  idToken?: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }

    const res = await fetch(API.PAYMENTS_REQUEST, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || 'Error al enviar la solicitud' };
    }

    return { success: true, requestId: json.requestId };
  } catch (err: any) {
    console.error('Error enviando solicitud de pago:', err);
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

/**
 * Obtener solicitudes de pago para el panel de administración
 */
export async function getPaymentRequests(
  filterStatus?: PaymentStatus
): Promise<PaymentRequest[]> {
  // 1. Consultar vía API de administración autenticada por PIN secreto
  const adminPin = getStoredAdminPin();
  if (adminPin) {
    try {
      const statusParam = filterStatus ? `&status=${encodeURIComponent(filterStatus)}` : '';
      const res = await fetch(`${API.ADMIN_PANEL}?action=payment_requests${statusParam}`, {
        headers: {
          'X-Admin-Pin': adminPin,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.requests)) {
          return json.requests as PaymentRequest[];
        }
      }
    } catch {
      // Fallback a consulta directa en Firestore
    }
  }

  try {
    const q = filterStatus
      ? query(
          collection(db, COLLECTION),
          where('status', '==', filterStatus)
        )
      : query(collection(db, COLLECTION));

    const snap = await getDocs(q);
    const list = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as PaymentRequest[];

    // Ordenar en memoria por createdAt descendente
    return list.sort((a, b) => {
      const timeA = (a.createdAt as any)?.toMillis
        ? (a.createdAt as any).toMillis()
        : a.createdAt instanceof Date
        ? a.createdAt.getTime()
        : 0;
      const timeB = (b.createdAt as any)?.toMillis
        ? (b.createdAt as any).toMillis()
        : b.createdAt instanceof Date
        ? b.createdAt.getTime()
        : 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Error cargando solicitudes de pago:', err);
    return [];
  }
}

/**
 * Obtener la solicitud de pago más reciente de un usuario
 */
export async function getLatestUserPaymentRequest(
  userId: string
): Promise<PaymentRequest | null> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      limit(5)
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;

    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PaymentRequest[];
    list.sort((a, b) => {
      const timeA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : 0;
      const timeB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : 0;
      return timeB - timeA;
    });

    return list[0] || null;
  } catch (err) {
    console.error('Error consultando pago del usuario:', err);
    return null;
  }
}

/**
 * Aprobar una solicitud de pago (solo admin con PIN o rol)
 */
export async function approvePaymentRequest(
  requestId: string,
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const adminPin = getStoredAdminPin();
    if (adminPin) {
      headers['X-Admin-Pin'] = adminPin;
    }
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }

    const res = await fetch(API.PAYMENTS_APPROVE, {
      method: 'POST',
      headers,
      body: JSON.stringify({ requestId }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || 'Error al aprobar el pago' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error aprobando pago:', err);
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

/**
 * Rechazar una solicitud de pago (solo admin con PIN o rol)
 */
export async function rejectPaymentRequest(
  input: PaymentRejectInput,
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const adminPin = getStoredAdminPin();
    if (adminPin) {
      headers['X-Admin-Pin'] = adminPin;
    }
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }

    const res = await fetch(API.PAYMENTS_REJECT, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || 'Error al rechazar el pago' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error rechazando pago:', err);
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

/**
 * Subir comprobante a Cloudinary o convertir a DataURL para persistencia visual
 */
export async function uploadPaymentCapture(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  // Si Cloudinary está configurado, subir directamente
  if (cloudName && uploadPreset) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.secure_url) return json.secure_url;
      }
    } catch (err) {
      console.warn('Fallo subida a Cloudinary, usando lector local:', err);
    }
  }

  // Respaldo confiable: lectura Data URL (Base64)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}
