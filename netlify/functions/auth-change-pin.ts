import type { Handler } from '@netlify/functions';
import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { initAdmin } from './_shared/admin';
import { corsHeaders } from './_shared/cors';
import { requireAuth } from './_shared/auth-guard';

initAdmin();

const WEAK_PINS = [
  '123456', '654321', '000000', '111111', '222222', '333333',
  '444444', '555555', '666666', '777777', '888888', '999999',
  '112233', '121212', '123123', '012345', '987654',
];

const ChangePinSchema = z.object({
  currentPin: z.string().regex(/^\d{6}$/),
  newPin: z.string().regex(/^\d{6}$/),
});

const isSequential = (p: string): boolean =>
  '0123456789'.includes(p) || '9876543210'.includes(p);

export const handler: Handler = async (event) => {
  const headers = corsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  try {
    // Verificar autenticación
    const authUser = await requireAuth(event.headers.authorization || event.headers.Authorization);
    if (!authUser) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'No autorizado' }) };
    }

    const parsed = ChangePinSchema.safeParse(JSON.parse(event.body || '{}'));
    if (!parsed.success) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Datos inválidos' }) };
    }

    const { currentPin, newPin } = parsed.data;

    // Validar nuevo PIN
    if (WEAK_PINS.includes(newPin) || isSequential(newPin)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'El nuevo PIN es demasiado débil. Elige otro.' }),
      };
    }

    if (currentPin === newPin) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'El nuevo PIN debe ser diferente al actual.' }),
      };
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(authUser.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuario no encontrado' }) };
    }

    const userData = userSnap.data()!;

    // Verificar PIN actual
    const pinOk = await bcrypt.compare(currentPin, userData.pinHash);
    if (!pinOk) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'PIN actual incorrecto' }) };
    }

    // Hashear y guardar nuevo PIN
    const newPinHash = await bcrypt.hash(newPin, 10);
    await userRef.update({ pinHash: newPinHash });

    // Registrar en auditoría
    await db.collection('users').doc(authUser.uid).collection('audit').add({
      action: 'pin_changed',
      ip: event.headers['x-nf-client-connection-ip'] || 'unknown',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'PIN actualizado correctamente' }),
    };
  } catch (err) {
    console.error('change-pin error', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno del servidor' }) };
  }
};
