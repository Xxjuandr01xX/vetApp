import type { Handler } from '@netlify/functions';
import admin from 'firebase-admin';
import { initAdmin } from './_shared/admin';
import { corsHeaders } from './_shared/cors';
import { requireAdmin } from './_shared/auth-guard';
import { paymentRejectSchema } from '../../lib/validations/payment';

initAdmin();

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

    const parsed = paymentRejectSchema.safeParse(JSON.parse(event.body || '{}'));
    if (!parsed.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Datos inválidos', details: parsed.error.flatten() }),
      };
    }

    const { requestId, reason } = parsed.data;
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

    const processedAt = admin.firestore.FieldValue.serverTimestamp();

    // 2. Actualizar solicitud a 'rejected' con motivo
    await reqRef.update({
      status: 'rejected',
      reason,
      processedAt,
      processedBy: adminUser.uid,
    });

    // 3. Actualizar estado de pago en el usuario
    await db.collection('users').doc(req.userId).update({
      paymentStatus: 'rejected',
    });

    // 4. Guardar en payment_history
    await db.collection('payment_history').add({
      ...req,
      status: 'rejected',
      reason,
      processedAt,
      processedBy: adminUser.uid,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Solicitud de pago rechazada.',
      }),
    };
  } catch (err: any) {
    console.error('Error en payments-reject:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor al rechazar el pago' }),
    };
  }
};
