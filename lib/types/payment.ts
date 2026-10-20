import { Timestamp } from 'firebase/firestore';

export type PaymentPlan = 'premium_monthly' | 'premium_yearly';
export type PaymentMethod = 'pago_movil' | 'binance';
export type PaymentCurrency = 'USD' | 'EUR';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentRequest {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: PaymentPlan;
  amount: number;
  currency: PaymentCurrency;
  method: PaymentMethod;
  reference: string;
  captureUrl: string; // Cloudinary o URL del comprobante
  status: PaymentStatus;
  reason?: string; // Motivo si es rechazado
  createdAt?: Timestamp | Date;
  processedAt?: Timestamp | Date;
  processedBy?: string; // UID del admin
}

export interface PaymentHistoryItem extends PaymentRequest {
  id: string;
  archivedAt?: Timestamp | Date;
}
