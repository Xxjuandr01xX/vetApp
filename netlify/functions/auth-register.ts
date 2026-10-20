import type { Handler } from '@netlify/functions';
import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { initAdmin } from './_shared/admin';
import { corsHeaders } from './_shared/cors';
import { notifyTelegramNewUser } from './_shared/telegram';

initAdmin();

const WEAK_PINS = [
  '123456', '654321', '000000', '111111', '222222', '333333',
  '444444', '555555', '666666', '777777', '888888', '999999',
  '112233', '121212', '123123', '012345', '987654',
];

const RegisterSchema = z.object({
  email: z.string().email('Email inválido'),
  displayName: z.string().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60 caracteres'),
  pin: z.string().regex(/^\d{6}$/, 'El PIN debe ser de 6 dígitos'),
});

const isSequential = (p: string): boolean =>
  '0123456789'.includes(p) || '9876543210'.includes(p);

const isRepeating = (p: string): boolean =>
  new Set(p.split('')).size === 1;

export const handler: Handler = async (event) => {
  const headers = corsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  try {
    const parsed = RegisterSchema.safeParse(JSON.parse(event.body || '{}'));

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

    const { email, displayName, pin } = parsed.data;

    // Validar PIN débil
    if (WEAK_PINS.includes(pin) || isSequential(pin) || isRepeating(pin)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'El PIN es demasiado débil. Elige otro.' }),
      };
    }

    // Verificar si el email ya existe
    try {
      await admin.auth().getUserByEmail(email);
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'El email ya está registrado' }),
      };
    } catch {
      // No existe, continuar
    }

    // Crear usuario en Firebase Auth con password aleatorio
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const userRecord = await admin.auth().createUser({
      email,
      password: randomPassword,
      displayName,
      emailVerified: false,
    });

    // Hashear el PIN
    const pinHash = await bcrypt.hash(pin, 10);

    // Crear documento en Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      role: 'free',
      pinHash,
      failedAttempts: 0,
      lockedUntil: null,
      paymentStatus: 'none',
      premiumUntil: null,
      locale: 'es-VE',
      onboardingCompleted: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'free' });

    // Enviar aviso de nuevo usuario al Bot de Telegram
    await notifyTelegramNewUser({
      uid: userRecord.uid,
      displayName,
      email,
      role: 'free',
    });

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ success: true, uid: userRecord.uid }),
    };
  } catch (err) {
    console.error('register error', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};
