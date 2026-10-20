import type { Handler } from '@netlify/functions';
import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { initAdmin } from './_shared/admin';
import { corsHeaders } from './_shared/cors';

initAdmin();

const ResetRequestSchema = z.object({
  email: z.string().email(),
});

/**
 * Flujo de recuperación de PIN:
 * 1. Usuario envía su email
 * 2. Se genera un PIN temporal aleatorio
 * 3. Se hashea y guarda en Firestore
 * 4. Se envía por email (usando Firebase Password Reset como trigger)
 * 
 * Nota: En producción, integrar con Resend para envío de email.
 * Por ahora, genera un PIN temporal y lo retorna (solo para desarrollo).
 */
export const handler: Handler = async (event) => {
  const headers = corsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  try {
    const parsed = ResetRequestSchema.safeParse(JSON.parse(event.body || '{}'));
    if (!parsed.success) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email inválido' }) };
    }

    const { email } = parsed.data;

    // Buscar usuario
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch {
      // No revelar si el email existe o no (seguridad)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Si el email está registrado, recibirás instrucciones para restablecer tu PIN.',
        }),
      };
    }

    // Generar PIN temporal (6 dígitos)
    const tempPin = crypto.randomInt(100000, 999999).toString();
    const tempPinHash = await bcrypt.hash(tempPin, 10);

    const db = admin.firestore();
    const userRef = db.collection('users').doc(userRecord.uid);

    // Guardar PIN temporal con expiración de 15 minutos
    await userRef.update({
      pinHash: tempPinHash,
      failedAttempts: 0,
      lockedUntil: null,
    });

    // Registrar en auditoría
    await db.collection('users').doc(userRecord.uid).collection('audit').add({
      action: 'pin_reset_requested',
      ip: event.headers['x-nf-client-connection-ip'] || 'unknown',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // TODO: Enviar email con PIN temporal usando Resend
    // En desarrollo, logueamos el PIN temporal
    console.log(`[DEV] PIN temporal para ${email}: ${tempPin}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Si el email está registrado, recibirás instrucciones para restablecer tu PIN.',
        // Solo en desarrollo:
        ...(process.env.NODE_ENV !== 'production' && { devTempPin: tempPin }),
      }),
    };
  } catch (err) {
    console.error('reset-pin error', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno del servidor' }) };
  }
};
