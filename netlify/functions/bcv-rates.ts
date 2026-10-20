import type { Handler } from '@netlify/functions';
import admin from 'firebase-admin';
import { initAdmin } from './_shared/admin';
import { corsHeaders } from './_shared/cors';
import { parseDolarApiRates } from '../../lib/utils/currency';

initAdmin();

const DOLARAPI_URL = 'https://ve.dolarapi.com/v1/cotizaciones';

export const handler: Handler = async (event) => {
  const headers = corsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const db = admin.firestore();
  const today = new Date().toISOString().split('T')[0];
  const cacheRef = db.collection('bcv_rates').doc(today);

  // 1) Capa Firestore: ¿Ya se consultó hoy?
  try {
    const cached = await cacheRef.get();
    if (cached.exists) {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Cache-Control': 'public, max-age=3600',
        },
        body: JSON.stringify(cached.data()),
      };
    }
  } catch (err) {
    console.warn('Advertencia al consultar caché de bcv_rates:', err);
  }

  // 2) Consulta a DolarAPI
  try {
    const res = await fetch(DOLARAPI_URL, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error(`DolarAPI respondió con status ${res.status}`);

    const data = (await res.json()) as any[];
    const parsed = parseDolarApiRates(data, today);

    const rates = {
      ...parsed,
      fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Guardar en Firestore para el resto del día (1 escritura/día)
    await cacheRef.set(rates).catch((err) => {
      console.error('Error al guardar tasa en Firestore:', err);
    });

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=3600',
      },
      body: JSON.stringify(rates),
    };
  } catch (err) {
    console.error('bcv-rates fetch error, intentando respaldo:', err);

    // 3) Respaldo: Buscar la última tasa histórica guardada
    try {
      const last = await db
        .collection('bcv_rates')
        .orderBy('date', 'desc')
        .limit(1)
        .get();

      if (!last.empty) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ...last.docs[0].data(), stale: true }),
        };
      }
    } catch (fallbackErr) {
      console.error('Error al buscar última tasa histórica:', fallbackErr);
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'No se pudo obtener la tasa BCV' }),
    };
  }
};
