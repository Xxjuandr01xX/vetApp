'use client';

import useSWR from 'swr';
import { getBcvRates } from '@/lib/services/bcv';
import { BcvRate } from '@/lib/types/bcv';

export function useBcvRates() {
  const { data, error, isLoading, mutate } = useSWR<BcvRate>(
    'vetsaas:bcv-rates',
    () => getBcvRates(),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      refreshInterval: 60 * 60 * 1000, // 1 hora
      dedupingInterval: 5 * 60 * 1000,
    }
  );

  return {
    rates: data,
    isLoading,
    error,
    refresh: () => mutate(getBcvRates(true)),
  };
}
