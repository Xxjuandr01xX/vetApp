export interface BcvRate {
  date: string; // YYYY-MM-DD
  usd: number;
  eur: number;
  usdUpdatedAt: string; // Del campo fechaActualizacion de DolarAPI
  eurUpdatedAt: string;
  source: 'DolarAPI (BCV)' | string;
  fetchedAt?: any;
  stale?: boolean;
}

export interface DolarApiItem {
  moneda: string;
  fuente: string;
  nombre: string;
  promedio: number;
  fechaActualizacion: string;
}
