import type { Handler } from '@netlify/functions';
import admin from 'firebase-admin';
import { initAdmin } from './_shared/admin';
import { corsHeaders } from './_shared/cors';
import { requireAdmin } from './_shared/auth-guard';
import { paymentApproveSchema } from '../../lib/validations/payment';

initAdmin();

const DAYS_MONTHLY = 30;
const DAYS_YEARLY = 365;

export const handler: Handler = async (event) => {
  const headers = corsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  try {
    // 1. Verificar rol o PIN secreto de administrador
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const adminPinHeader = event.headers['x-admin-pin'] || event.headers['X-Admin-Pin'];
    const adminUser = await requireAdmin(authHeader, adminPinHeader);

    if (!adminUser) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Acceso denegado: Se requiere PIN de Administrador válido' }),
      };
    }

    const parsed = paymentApproveSchema.safeParse(JSON.parse(event.body || '{}'));
    if (!parsed.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Datos inválidos', details: parsed.error.flatten() }),
      };
    }

    const { requestId } = parsed.data;
    const db = admin.firestore();

    const reqRef = db.collection('payment_requests').doc(requestId);
    const reqSnap = await reqRef.get();

    if (!reqSnap.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Solicitud de pago no encontrada' }),
      };
    }

    const req = reqSnap.data()!;
    if (req.status !== 'pending') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: `La solicitud ya fue procesada (estado actual: ${req.status})` }),
      };
    }

    // Calcular días de suscripción
    const durationDays = req.plan === 'premium_yearly' ? DAYS_YEARLY : DAYS_MONTHLY;
    const now = Date.now();
    const premiumUntil = admin.firestore.Timestamp.fromMillis(
      now + durationDays * 24 * 60 * 60 * 1000
    );

    const processedAt = admin.firestore.FieldValue.serverTimestamp();

    // 2. Actualizar solicitud de pago a 'approved'
    await reqRef.update({
      status: 'approved',
      processedAt,
      processedBy: adminUser.uid,
    });

    // 3. Otorgar rol Premium al usuario en Firestore
    await db.collection('users').doc(req.userId).update({
      role: 'premium',
      paymentStatus: 'approved',
      premiumUntil,
    });

    // 4. Asignar Custom Claims en Firebase Auth
    await admin.auth().setCustomUserClaims(req.userId, { role: 'premium' });

    // 5. Registrar en payment_history (registro inmutable)
    await db.collection('payment_history').add({
      ...req,
      status: 'approved',
      processedAt,
      processedBy: adminUser.uid,
      premiumUntil,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Pago aprobado con éxito. El usuario ahora es Premium.',
      }),
    };
  } catch (err: any) {
    console.error('Error en payments-approve:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor al aprobar el pago' }),
    };
  }
};
