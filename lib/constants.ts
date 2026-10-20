// ===== Colores de la App =====
export const COLORS = {
  primary: '#1E3A5F',
  primaryLight: '#3B82F6',
  accent: '#10B981',
  accentWarm: '#F59E0B',
  danger: '#EF4444',
} as const;

// ===== Límites del Plan =====
export const PLAN_LIMITS = {
  FREE_PATIENT_LIMIT: 30,
  PREMIUM_DAYS: 30,
  PREMIUM_PRICE_USD: 12,
  PREMIUM_YEARLY_USD: 120,
} as const;

// ===== Auth =====
export const AUTH = {
  PIN_LENGTH: 6,
  MAX_ATTEMPTS: 5,
  LOCK_MINUTES: 15,
} as const;

// ===== API Endpoints =====
export const API = {
  AUTH_REGISTER: '/api/auth-register',
  AUTH_LOGIN: '/api/auth-login-pin',
  AUTH_CHANGE_PIN: '/api/auth-change-pin',
  AUTH_RESET_PIN: '/api/auth-reset-pin',
  PAYMENTS_REQUEST: '/api/payments-request',
  PAYMENTS_APPROVE: '/api/payments-approve',
  PAYMENTS_REJECT: '/api/payments-reject',
  ADMIN_PANEL: '/api/admin-panel',
  BCV_RATES: '/api/bcv-rates',
} as const;

// ===== Especies =====
export const SPECIES = [
  'Canino',
  'Felino',
  'Equino',
  'Ave',
  'Exótico',
  'Otro',
] as const;

export const SPECIES_LIST = SPECIES;

// ===== Estados de Pago =====
export const PAYMENT_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// ===== Roles =====
export const ROLES = {
  FREE: 'free',
  PREMIUM: 'premium',
  ADMIN: 'admin',
} as const;
