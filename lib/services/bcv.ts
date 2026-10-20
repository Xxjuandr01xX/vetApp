import { BcvRate } from '@/lib/types/bcv';
import { API } from '@/lib/constants';
import {
  CACHE_KEYS,
  getCacheItem,
  setCacheItem,
} from '@/lib/utils/offline-cache';

const LOCAL_STORAGE_KEY = 'vetsaas:bcv-rate:v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de caché en cliente

interface CachedBcvData {
  savedAt: number;
  rate: BcvRate;
}

/**
 * Obtiene la tasa oficial del BCV implementando la capa de caché del cliente (localStorage + IndexedDB - 1 hora).
 * Si la red falla o está offline, retorna la última tasa guardada.
 */
export async function getBcvRates(forceRefresh = false): Promise<BcvRate> {
  // 1) Intentar recuperar de localStorage o IndexedDB si está fresco
  if (typeof window !== 'undefined' && !forceRefresh) {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed: CachedBcvData = JSON.parse(raw);
        if (Date.now() - parsed.savedAt < CACHE_TTL_MS && parsed.rate?.usd) {
          return parsed.rate;
        }
      }
    } catch {
      // Ignorar error de parsing en localStorage
    }

    const idbCached = await getCacheItem<BcvRate>(CACHE_KEYS.bcvRate, {
      allowExpired: false,
    });
    if (idbCached?.data?.usd) {
      return idbCached.data;
    }
  }

  // 2) Consultar endpoint interno
  try {
    const res = await fetch(API.BCV_RATES, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Error en API de tasas: ${res.status}`);
    }

    const rate = (await res.json()) as BcvRate;

    // Guardar en localStorage + IndexedDB
    if (typeof window !== 'undefined' && rate?.usd) {
      try {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            savedAt: Date.now(),
            rate,
          } satisfies CachedBcvData)
        );
      } catch {
        // Ignorar límites de almacenamiento
      }
      setCacheItem(CACHE_KEYS.bcvRate, rate, CACHE_TTL_MS).catch(() => {});
    }

    return rate;
  } catch (err) {
    // 3) Respaldo offline: localStorage o IndexedDB aunque esté vencido
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed: CachedBcvData = JSON.parse(raw);
          if (parsed.rate) {
            return { ...parsed.rate, stale: true };
          }
        }
      } catch {
        // Ignorar
      }

      const idbStale = await getCacheItem<BcvRate>(CACHE_KEYS.bcvRate, {
        allowExpired: true,
      });
      if (idbStale?.data) {
        return { ...idbStale.data, stale: true };
      }
    }

    throw err;
  }
}
