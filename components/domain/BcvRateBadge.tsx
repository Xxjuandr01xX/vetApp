'use client';

import { useBcvRates } from '@/lib/hooks/useBcvRates';
import { formatVES } from '@/lib/utils/currency';
import { Spinner } from 'flowbite-react';
import { HiCurrencyDollar, HiRefresh } from 'react-icons/hi';

interface BcvRateBadgeProps {
  className?: string;
  showRefresh?: boolean;
}

export function BcvRateBadge({ className = '', showRefresh = false }: BcvRateBadgeProps) {
  const { rates, isLoading, error, refresh } = useBcvRates();

  if (isLoading && !rates) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20 ${className}`}
      >
        <Spinner size="xs" color="info" />
        <span>Cargando tasa BCV...</span>
      </div>
    );
  }

  if (error && !rates) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 ${className}`}
      >
        <span>Tasa BCV no disponible</span>
      </div>
    );
  }

  const rateValue = rates?.usd ? formatVES(rates.usd) : 'Bs. --';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20 backdrop-blur-sm shadow-sm ${className}`}
      title={`Tasa oficial BCV: ${rateValue} por USD. Fecha: ${rates?.date || 'Hoy'}${rates?.stale ? ' (Histórica)' : ''}`}
    >
      <HiCurrencyDollar className="h-4 w-4 text-emerald-400 shrink-0" />
      <span className="text-gray-200 text-[11px] font-normal">BCV:</span>
      <span className="text-white font-bold">{rateValue}</span>
      {rates?.stale && (
        <span className="text-[10px] text-amber-300 font-normal">(ayer)</span>
      )}
      {showRefresh && (
        <button
          type="button"
          onClick={() => refresh()}
          className="ml-1 text-gray-300 hover:text-white transition-colors"
          title="Actualizar tasa"
        >
          <HiRefresh className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
