import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { API } from '@/lib/constants';

export type UserRole = 'free' | 'premium' | 'admin';

const ADMIN_PIN_STORAGE_KEY = 'vetsaas_admin_pin';
export const DEFAULT_ADMIN_SECRET_PIN = 'X1X-Y24';

export function getStoredAdminPin(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(ADMIN_PIN_STORAGE_KEY) || '';
}

export function setStoredAdminPin(pin: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_PIN_STORAGE_KEY, pin.trim().toUpperCase());
}

export function clearStoredAdminPin(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_PIN_STORAGE_KEY);
}

/**
 * Verifica el PIN secreto de acceso al panel administrativo (/panel).
 */
export async function verifyAdminSecretPin(
  pin: string
): Promise<{ valid: boolean; error?: string }> {
  const normalized = pin.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, error: 'Ingresa el PIN administrativo' };
  }

  try {
    const res = await fetch(API.ADMIN_PANEL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'verify_admin_pin',
        pin: normalized,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.valid) {
        setStoredAdminPin(normalized);
        return { valid: true };
      }
    } else if (res.status === 401) {
      return { valid: false, error: 'PIN secreto incorrecto. Acceso denegado.' };
    }
  } catch {
    // Fallback local si la función serverless no responde
  }

  if (normalized === DEFAULT_ADMIN_SECRET_PIN) {
    setStoredAdminPin(normalized);
    return { valid: true };
  }

  return { valid: false, error: 'PIN secreto incorrecto. Acceso denegado.' };
}

export interface PagoMovilConfig {
  bank: string;
  phone: string;
  idDocument: string;
  holderName: string;
  enabled: boolean;
}

export interface BinancePayConfig {
  payId: string;
  email: string;
  holderName: string;
  notes: string;
  enabled: boolean;
}

export interface PaymentMethodsConfig {
  pagoMovil: PagoMovilConfig;
  binance: BinancePayConfig;
  updatedAt?: unknown;
  updatedBy?: string;
}

export interface AdminUserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  paymentStatus?: string;
  premiumUntil?: Date | Timestamp | number | null;
  patientCount?: number;
  createdAt?: Date | Timestamp | number | null;
}

export const DEFAULT_PAYMENT_METHODS_CONFIG: PaymentMethodsConfig = {
  pagoMovil: {
    bank: 'Banesco (0134)',
    phone: '0414-1234567',
    idDocument: 'V-19.876.543',
    holderName: 'VetApp Administración',
    enabled: true,
  },
  binance: {
    payId: '123456789',
    email: 'pagos@vetapp.com',
    holderName: 'VetApp Oficial',
    notes: 'Enviar el monto exacto en USDT a través de Binance Pay.',
    enabled: true,
  },
};

function normalizeConfig(raw: Record<string, any> | null | undefined): PaymentMethodsConfig {
  if (!raw) return DEFAULT_PAYMENT_METHODS_CONFIG;
  return {
    pagoMovil: {
      bank: raw.pagoMovil?.bank ?? DEFAULT_PAYMENT_METHODS_CONFIG.pagoMovil.bank,
      phone: raw.pagoMovil?.phone ?? DEFAULT_PAYMENT_METHODS_CONFIG.pagoMovil.phone,
      idDocument: raw.pagoMovil?.idDocument ?? DEFAULT_PAYMENT_METHODS_CONFIG.pagoMovil.idDocument,
      holderName: raw.pagoMovil?.holderName ?? DEFAULT_PAYMENT_METHODS_CONFIG.pagoMovil.holderName,
      enabled: raw.pagoMovil?.enabled ?? true,
    },
    binance: {
      payId: raw.binance?.payId ?? DEFAULT_PAYMENT_METHODS_CONFIG.binance.payId,
      email: raw.binance?.email ?? DEFAULT_PAYMENT_METHODS_CONFIG.binance.email,
      holderName: raw.binance?.holderName ?? DEFAULT_PAYMENT_METHODS_CONFIG.binance.holderName,
      notes: raw.binance?.notes ?? DEFAULT_PAYMENT_METHODS_CONFIG.binance.notes,
      enabled: raw.binance?.enabled ?? true,
    },
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,
  };
}

function buildAdminHeaders(idToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const pin = getStoredAdminPin();
  if (pin) {
    headers['X-Admin-Pin'] = pin;
  }
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }
  return headers;
}

/**
 * Obtiene los datos configurados de Pago Móvil y Binance desde Firestore (/system/payment_config)
 * con respaldo a la función serverless o configuración por defecto.
 */
export async function getPaymentMethodsConfig(): Promise<PaymentMethodsConfig> {
  try {
    const res = await fetch(`${API.ADMIN_PANEL}?action=payment_config`);
    if (res.ok) {
      const json = await res.json();
      if (json.config) {
        return normalizeConfig(json.config);
      }
    }
  } catch {
    // Fallback a lectura directa de Firestore
  }

  try {
    const docRef = doc(db, 'system', 'payment_config');
    const snap = await getDoc(docRef);
    if (snap && typeof snap.exists === 'function' && snap.exists()) {
      return normalizeConfig(snap.data());
    }
  } catch {
    // Usar valores por defecto si estamos offline o sin configurar
  }

  return DEFAULT_PAYMENT_METHODS_CONFIG;
}

/**
 * Guarda los datos de Pago Móvil y Binance en el panel administrativo (/panel).
 */
export async function savePaymentMethodsConfig(
  config: Pick<PaymentMethodsConfig, 'pagoMovil' | 'binance'>,
  idToken?: string,
  adminUid?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Guardar mediante endpoint administrativo autenticado por PIN secreto X1X-Y24
  try {
    const res = await fetch(API.ADMIN_PANEL, {
      method: 'POST',
      headers: buildAdminHeaders(idToken),
      body: JSON.stringify({
        action: 'save_payment_config',
        pagoMovil: config.pagoMovil,
        binance: config.binance,
      }),
    });

    if (res.ok) {
      return { success: true };
    }
  } catch {
    // Continuar con guardado directo en Firestore
  }

  // 2. Respaldo directo en Firestore (/system/payment_config)
  try {
    const docRef = doc(db, 'system', 'payment_config');
    await setDoc(
      docRef,
      {
        pagoMovil: config.pagoMovil,
        binance: config.binance,
        updatedAt: serverTimestamp(),
        ...(adminUid ? { updatedBy: adminUid } : {}),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err: any) {
    console.error('Error guardando configuración de pagos:', err);
    return {
      success: false,
      error: err?.message || 'No se pudo guardar la configuración de pagos',
    };
  }
}

function toMillis(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val instanceof Date) return val.getTime();
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  return 0;
}

/**
 * Obtiene la lista de todos los usuarios registrados para el panel administrativo (/panel).
 */
export async function getAdminUsers(idToken?: string): Promise<AdminUserRecord[]> {
  try {
    const res = await fetch(`${API.ADMIN_PANEL}?action=users`, {
      headers: buildAdminHeaders(idToken),
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.users)) {
        return json.users;
      }
    }
  } catch {
    // Fallback a consulta directa en Firestore
  }

  try {
    const snap = await getDocs(collection(db, 'users'));
    const list: AdminUserRecord[] = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        email: data.email || '',
        displayName: data.displayName || 'Sin nombre',
        role: (data.role as UserRole) || 'free',
        paymentStatus: data.paymentStatus || 'none',
        premiumUntil: data.premiumUntil || null,
        patientCount: data.patientCount || 0,
        createdAt: data.createdAt || null,
      };
    });

    return list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  } catch (err) {
    console.error('Error cargando usuarios en /panel:', err);
    return [];
  }
}

/**
 * Aprueba o cambia el modo (Gratis / Premium / Admin) de un usuario desde /panel.
 */
export async function updateUserSubscriptionRole(
  params: {
    targetUid: string;
    role: UserRole;
    durationDays?: number;
  },
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  const durationDays = params.durationDays ?? 30;

  // 1. Actualizar vía endpoint administrativo (actualiza Firestore + Firebase Auth Custom Claims)
  try {
    const res = await fetch(API.ADMIN_PANEL, {
      method: 'POST',
      headers: buildAdminHeaders(idToken),
      body: JSON.stringify({
        action: 'set_user_role',
        targetUid: params.targetUid,
        role: params.role,
        durationDays,
      }),
    });

    if (res.ok) {
      return { success: true };
    }
  } catch {
    // Continuar con respaldo directo en Firestore
  }

  // 2. Respaldo directo en Firestore (/users/{targetUid})
  try {
    const now = Date.now();
    const premiumUntil =
      params.role === 'premium'
        ? Timestamp.fromMillis(now + durationDays * 24 * 60 * 60 * 1000)
        : null;

    await updateDoc(doc(db, 'users', params.targetUid), {
      role: params.role,
      paymentStatus: params.role === 'premium' ? 'approved' : 'none',
      premiumUntil,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error actualizando rol del usuario:', err);
    return {
      success: false,
      error: err?.message || 'No se pudo actualizar el modo del usuario',
    };
  }
}

/**
 * Envía una notificación de prueba al Bot de Telegram configurado.
 */
export async function sendTestTelegramNotification(
  displayName: string,
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(API.ADMIN_PANEL, {
      method: 'POST',
      headers: buildAdminHeaders(idToken),
      body: JSON.stringify({
        action: 'test_telegram',
        displayName,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success) {
      return { success: true };
    }
    return {
      success: false,
      error: json.error || 'No se pudo enviar la notificación de prueba',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error de conexión al probar Telegram',
    };
  }
}
