import type { Handler } from '@netlify/functions';
import admin from 'firebase-admin';
import { z } from 'zod';
import { initAdmin } from './_shared/admin';
import { corsHeaders } from './_shared/cors';
import { requireAdmin, verifyAdminPin } from './_shared/auth-guard';
import { notifyTelegramNewUser } from './_shared/telegram';

initAdmin();

const SetUserRoleSchema = z.object({
  action: z.literal('set_user_role'),
  targetUid: z.string().min(1, 'El UID del usuario es obligatorio'),
  role: z.enum(['free', 'premium', 'admin']),
  durationDays: z.number().int().min(1).max(3650).optional().default(30),
});

const SavePaymentConfigSchema = z.object({
  action: z.literal('save_payment_config'),
  pagoMovil: z.object({
    bank: z.string().min(1, 'Banco requerido').max(120),
    phone: z.string().min(1, 'Teléfono requerido').max(40),
    idDocument: z.string().min(1, 'Cédula o RIF requerido').max(40),
    holderName: z.string().max(100).optional().default(''),
    enabled: z.boolean().optional().default(true),
  }),
  binance: z.object({
    payId: z.string().max(80).optional().default(''),
    email: z.string().max(120).optional().default(''),
    holderName: z.string().max(100).optional().default(''),
    notes: z.string().max(300).optional().default(''),
    enabled: z.boolean().optional().default(true),
  }),
});

export const handler: Handler = async (event) => {
  const headers = corsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const db = admin.firestore();
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const adminPinHeader = event.headers['x-admin-pin'] || event.headers['X-Admin-Pin'];

  try {
    // GET: Obtener configuración de pagos, usuarios o solicitudes de pago (protegido por PIN X1X-Y24)
    if (event.httpMethod === 'GET') {
      const action = event.queryStringParameters?.action || 'payment_config';

      if (action === 'payment_config') {
        const snap = await db.collection('system').doc('payment_config').get();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            config: snap.exists ? snap.data() : null,
          }),
        };
      }

      if (action === 'users') {
        const adminUser = await requireAdmin(authHeader, adminPinHeader);

        if (!adminUser) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Acceso denegado: Se requiere el PIN secreto de Administrador' }),
          };
        }

        const usersSnap = await db.collection('users').get();
        const users = usersSnap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            uid: docSnap.id,
            email: data.email || '',
            displayName: data.displayName || 'Sin nombre',
            role: data.role || 'free',
            paymentStatus: data.paymentStatus || 'none',
            premiumUntil: data.premiumUntil ? data.premiumUntil.toMillis() : null,
            patientCount: data.patientCount || 0,
            createdAt: data.createdAt ? data.createdAt.toMillis() : null,
          };
        });

        users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ users }),
        };
      }

      if (action === 'payment_requests') {
        const adminUser = await requireAdmin(authHeader, adminPinHeader);

        if (!adminUser) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Acceso denegado: Se requiere el PIN secreto de Administrador' }),
          };
        }

        const filterStatus = event.queryStringParameters?.status;
        const reqQuery = filterStatus
          ? db.collection('payment_requests').where('status', '==', filterStatus)
          : db.collection('payment_requests');

        const reqSnap = await reqQuery.get();
        const requests = reqSnap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || null,
            processedAt: data.processedAt?.toMillis ? data.processedAt.toMillis() : data.processedAt || null,
          };
        });

        requests.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ requests }),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Acción GET no válida' }),
      };
    }

    // POST: Verificar PIN secreto o ejecutar acciones administrativas
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      if (body.action === 'verify_admin_pin') {
        const isValid = verifyAdminPin(body.pin);
        if (!isValid) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ valid: false, error: 'PIN administrativo incorrecto' }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ valid: true }),
        };
      }

      const adminUser = await requireAdmin(authHeader, adminPinHeader || body.adminPin);

      if (!adminUser) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Acceso denegado: Se requiere el PIN secreto de Administrador' }),
        };
      }

      if (body.action === 'test_telegram') {
        const sent = await notifyTelegramNewUser({
          uid: adminUser.uid,
          displayName: body.displayName || 'Prueba desde /panel (Juan D. Rincón)',
          email: adminUser.email || 'admin@vetsaas.com',
          role: 'admin',
        });

        return {
          statusCode: sent ? 200 : 502,
          headers,
          body: JSON.stringify({
            success: sent,
            error: sent ? undefined : 'No se pudo enviar el mensaje a Telegram',
          }),
        };
      }

      if (body.action === 'set_user_role') {
        const parsed = SetUserRoleSchema.safeParse(body);
        if (!parsed.success) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Datos inválidos', details: parsed.error.flatten() }),
          };
        }

        const { targetUid, role, durationDays } = parsed.data;
        const now = Date.now();
        const premiumUntil =
          role === 'premium'
            ? admin.firestore.Timestamp.fromMillis(now + durationDays * 24 * 60 * 60 * 1000)
            : null;

        const updatePayload: Record<string, unknown> = {
          role,
          paymentStatus: role === 'premium' ? 'approved' : 'none',
          premiumUntil,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('users').doc(targetUid).update(updatePayload);
        await admin.auth().setCustomUserClaims(targetUid, { role });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            uid: targetUid,
            role,
            premiumUntil: premiumUntil ? premiumUntil.toMillis() : null,
          }),
        };
      }

      if (body.action === 'save_payment_config') {
        const parsed = SavePaymentConfigSchema.safeParse(body);
        if (!parsed.success) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Datos de pago inválidos', details: parsed.error.flatten() }),
          };
        }

        const { pagoMovil, binance } = parsed.data;
        const configData = {
          pagoMovil,
          binance,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: adminUser.uid,
        };

        await db.collection('system').doc('payment_config').set(configData, { merge: true });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            config: configData,
          }),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Acción POST desconocida' }),
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  } catch (err: any) {
    console.error('Error en admin-panel:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno en el panel administrativo' }),
    };
  }
};
