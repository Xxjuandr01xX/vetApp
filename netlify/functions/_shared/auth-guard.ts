import admin from 'firebase-admin';
import { initAdmin } from './admin';

export interface AuthResult {
  uid: string;
  email: string;
  role: string;
}

export async function verifyAuth(authHeader: string | undefined): Promise<AuthResult | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    initAdmin();
    const idToken = authHeader.substring(7);
    const decoded = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email || '',
      role: (decoded.role as string) || 'free',
    };
  } catch {
    return null;
  }
}

export const ADMIN_SECRET_PIN = process.env.ADMIN_SECRET_PIN || 'X1X-Y24';

export function verifyAdminPin(pin: string | undefined): boolean {
  if (!pin) return false;
  return pin.trim().toUpperCase() === ADMIN_SECRET_PIN.toUpperCase();
}

export async function requireAdmin(
  authHeader: string | undefined,
  adminPinHeader?: string | undefined
): Promise<AuthResult | null> {
  if (verifyAdminPin(adminPinHeader)) {
    return {
      uid: 'admin-pin',
      email: 'admin@vetsaas.com',
      role: 'admin',
    };
  }

  const user = await verifyAuth(authHeader);
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function requireAuth(authHeader: string | undefined): Promise<AuthResult | null> {
  return verifyAuth(authHeader);
}
