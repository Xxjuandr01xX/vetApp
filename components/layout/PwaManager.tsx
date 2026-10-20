'use client';

import { useEffect } from 'react';
import { warmupVademecumCache } from '@/lib/services/medications';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';

export function PwaManager() {
  const { isOnline, reconnectedToast } = useOnlineStatus();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Registrar Service Worker para soporte PWA instalable y caché offline de páginas
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          console.warn('No se pudo registrar el Service Worker:', err);
        });
    }

    // 2. Precargar el catálogo del Vademécum en IndexedDB (1 lectura inicial)
    warmupVademecumCache().catch(() => {});
  }, []);

  if (isOnline && !reconnectedToast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full px-4 py-1.5 text-xs font-medium text-center transition-colors z-50 ${
        !isOnline
          ? 'bg-amber-500 text-white'
          : 'bg-emerald-600 text-white'
      }`}
    >
      {!isOnline ? (
        <span>
          ⚡ Modo sin conexión activo — Vademécum y expedientes sincronizados disponibles desde caché local (IndexedDB)
        </span>
      ) : (
        <span>
          ✅ Conexión restablecida — Sincronización en línea activa
        </span>
      )}
    </div>
  );
}
