import type { Handler } from '@netlify/functions';
import admin from 'firebase-admin';
import { initAdmin } from './_shared/admin';
import { corsHeaders } from './_shared/cors';
import { requireAuth } from './_shared/auth-guard';
import { notifyTelegramPayment } from './_shared/telegram';
import { paymentRequestSchema } from '../../lib/validations/payment';

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
    // 1. Validar autenticación
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const authUser = await requireAuth(authHeader);

    const parsed = paymentRequestSchema.safeParse(JSON.parse(event.body || '{}'));
    if (!parsed.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Datos inválidos',
          details: parsed.error.flatten(),
        }),
      };
    }

    const data = parsed.data;

    // Si viene autenticado, verificar que coincida con el userId
    if (authUser && authUser.uid !== data.userId && authUser.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'No autorizado para crear solicitud para otro usuario' }),
      };
    }

    const db = admin.firestore();

    // 2. Crear solicitud de pago en Firestore
    const reqRef = await db.collection('payment_requests').add({
      ...data,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Actualizar estado del usuario a 'pending'
    await db
      .collection('users')
      .doc(data.userId)
      .update({
        paymentStatus: 'pending',
      })
      .catch((err) => {
        console.warn('Advertencia actualizando paymentStatus del usuario:', err);
      });

    // 4. Notificar a Telegram en background (no bloquea respuesta)
    notifyTelegramPayment({
      reqId: reqRef.id,
      ...data,
    }).catch((err) => {
      console.error('Error en notifyTelegramPayment:', err);
    });

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        requestId: reqRef.id,
        message: 'Solicitud de pago recibida con éxito. Esperando aprobación del administrador.',
      }),
    };
  } catch (err: any) {
    console.error('Error en payments-request:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor al procesar solicitud de pago' }),
    };
  }
};
