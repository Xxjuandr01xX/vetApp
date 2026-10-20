import type { Handler } from '@netlify/functions';
import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { initAdmin } from './_shared/admin';
import { corsHeaders } from './_shared/cors';

initAdmin();

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const LoginSchema = z.object({
  email: z.string().email(),
  pin: z.string().regex(/^\d{6}$/),
});

export const handler: Handler = async (event) => {
  const headers = corsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  try {
    const parsed = LoginSchema.safeParse(JSON.parse(event.body || '{}'));
    if (!parsed.success) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Datos inválidos' }) };
    }

    const { email, pin } = parsed.data;

    // Buscar usuario en Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Credenciales inválidas' }) };
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(userRecord.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Credenciales inválidas' }) };
    }

    const userData = userSnap.data()!;
    const now = Date.now();

    // Verificar bloqueo temporal
    if (userData.lockedUntil && userData.lockedUntil.toMillis() > now) {
      const mins = Math.ceil((userData.lockedUntil.toMillis() - now) / 60000);
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: `Cuenta bloqueada. Intenta en ${mins} min.` }),
      };
    }

    // Verificar PIN
    const pinOk = await bcrypt.compare(pin, userData.pinHash);

    // Registrar intento (fire & forget)
    db.collection('login_attempts').add({
      email,
      ip: event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'unknown',
      userAgent: event.headers['user-agent'] || 'unknown',
      success: pinOk,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});

    if (!pinOk) {
      const attempts = (userData.failedAttempts || 0) + 1;
      const update: Record<string, unknown> = { failedAttempts: attempts };

      if (attempts >= MAX_ATTEMPTS) {
        update.lockedUntil = admin.firestore.Timestamp.fromMillis(now + LOCK_MINUTES * 60 * 1000);
        update.failedAttempts = 0;
      }

      await userRef.update(update);
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Credenciales inválidas' }) };
    }

    // Verificación perezosa de expiración premium
    let role = userData.role;
    if (role === 'premium' && userData.premiumUntil && userData.premiumUntil.toMillis() < now) {
      role = 'free';
      await userRef.update({ role: 'free', paymentStatus: 'none' });
      await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'free' });
    }

    // Resetear intentos fallidos
    await userRef.update({ failedAttempts: 0, lockedUntil: null });

    // Crear custom token
    const customToken = await admin.auth().createCustomToken(userRecord.uid, { role });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        customToken,
        user: {
          uid: userRecord.uid,
          email: userData.email,
          displayName: userData.displayName,
          role,
        },
      }),
    };
  } catch (err) {
    console.error('login error', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno del servidor' }) };
  }
};
