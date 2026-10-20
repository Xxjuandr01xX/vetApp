import { ServicePrice } from '@/lib/types/treatment';
import { BcvRate, DolarApiItem } from '@/lib/types/bcv';

/**
 * Cálculo del precio en Bolívares (VES) a partir de un monto en USD y la tasa de cambio.
 * Especificación VetSaaS (Sección 6): Math.round(amountUSD * rate * 100) / 100
 */
export function calcVES(amountUSD: number, rate: number): number {
  if (!amountUSD || amountUSD <= 0 || !rate || rate <= 0) return 0;
  return Number(Math.round(Number(`${amountUSD * rate}e2`)) + 'e-2');
}

/**
 * Formateo en formato venezolano para Bolívares (VES)
 * Ejemplo: "Bs. 1.250,50"
 */
export function formatVES(amount: number): string {
  const formatted = new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

  return `Bs. ${formatted}`;
}

/**
 * Formateo en Dólares americanos (USD)
 * Ejemplo: "$25.00"
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Construye el objeto con trazabilidad completa de precio y tasa utilizada (RF-30).
 */
export function buildServicePrice(params: {
  amountUSD: number;
  rate: number;
  rateDate: string;
  rateSource?: string;
  currency?: 'USD' | 'EUR';
  isManualRate?: boolean;
}): ServicePrice {
  const {
    amountUSD,
    rate,
    rateDate,
    rateSource = 'DolarAPI (BCV)',
    currency = 'USD',
    isManualRate = false,
  } = params;

  return {
    amountUSD,
    amountVES: calcVES(amountUSD, rate),
    rateUsed: rate,
    rateDate,
    rateSource,
    currency,
    isManualRate,
  };
}

/**
 * Extrae y valida las tasas oficiales desde la respuesta de DolarAPI
 */
export function parseDolarApiRates(
  data: DolarApiItem[],
  dateOverride?: string
): Omit<BcvRate, 'fetchedAt'> {
  if (!Array.isArray(data)) {
    throw new Error('Respuesta de cotizaciones inválida');
  }

  const usd = data.find((c) => c.moneda === 'USD' && c.fuente === 'oficial');
  const eur = data.find((c) => c.moneda === 'EUR' && c.fuente === 'oficial');

  if (!usd || !eur) {
    throw new Error('Sin cotizaciones oficiales de USD o EUR en DolarAPI');
  }

  const today = dateOverride || new Date().toISOString().split('T')[0];

  return {
    date: today,
    usd: usd.promedio,
    eur: eur.promedio,
    usdUpdatedAt: usd.fechaActualizacion,
    eurUpdatedAt: eur.fechaActualizacion,
    source: 'DolarAPI (BCV)',
  };
}
