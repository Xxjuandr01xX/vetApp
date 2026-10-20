import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  notifyTelegramNewUser,
  notifyTelegramPayment,
} from '../netlify/functions/_shared/telegram';
import {
  DEFAULT_PAYMENT_METHODS_CONFIG,
  getPaymentMethodsConfig,
  verifyAdminSecretPin,
} from '../lib/services/admin-panel';
import { verifyAdminPin, ADMIN_SECRET_PIN } from '../netlify/functions/_shared/auth-guard';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
      pagoMovil: {
        bank: 'Banco de Venezuela (0102)',
        phone: '0412-9998877',
        idDocument: 'V-16.773.990',
        holderName: 'Juan D. Rincón U.',
        enabled: true,
      },
      binance: {
        payId: '998877665',
        email: 'devjuand@vetsaas.com',
        holderName: 'devjuand',
        notes: 'Enviar monto exacto en USDT',
        enabled: true,
      },
    }),
  }),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  Timestamp: {
    fromMillis: vi.fn((ms: number) => ({ toMillis: () => ms })),
  },
}));

vi.mock('@/lib/firebase/client', () => ({
  db: {},
}));

describe('Telegram Bot Notifications & Admin /panel Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envía notificación a Telegram al registrarse un nuevo usuario con sus datos al chat 1677399010', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    const ok = await notifyTelegramNewUser({
      uid: 'user-uid-123',
      displayName: 'Dra. María Pérez',
      email: 'maria@veterinaria.com',
      role: 'free',
      registeredAt: '17 oct 2026, 10:30 p. m.',
    });

    expect(ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain(
      'https://api.telegram.org/bot8898310395:AAHZeZrz5HNx8sJXBIG2iNr9KnGd9n_MYnA/sendMessage'
    );

    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.chat_id).toBe('1677399010');
    expect(body.text).toContain('Nuevo Usuario Registrado en VetApp');
    expect(body.text).toContain('Dra. María Pérez');
    expect(body.text).toContain('maria@veterinaria.com');
    expect(body.text).toContain('user-uid-123');
    expect(body.text).toContain('/panel');
  });

  it('envía notificación de pago a Telegram apuntando a /panel', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    const ok = await notifyTelegramPayment({
      reqId: 'req-999',
      userName: 'Dr. Carlos Gómez',
      userEmail: 'carlos@vet.com',
      plan: 'premium_monthly',
      amount: 12,
      currency: 'USD',
      method: 'pago_movil',
      reference: '88776655',
      captureUrl: 'data:image/png;base64,iVBORw0KGgo=',
    });

    expect(ok).toBe(true);
    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.chat_id).toBe('1677399010');
    expect(body.text).toContain('/panel?reqId=req-999');
  });

  it('obtiene la configuración personalizada de Pago Móvil y Binance desde /system/payment_config', async () => {
    const config = await getPaymentMethodsConfig();

    expect(config.pagoMovil.bank).toBe('Banco de Venezuela (0102)');
    expect(config.pagoMovil.phone).toBe('0412-9998877');
    expect(config.pagoMovil.idDocument).toBe('V-16.773.990');
    expect(config.pagoMovil.holderName).toBe('Juan D. Rincón U.');

    expect(config.binance.payId).toBe('998877665');
    expect(config.binance.email).toBe('devjuand@vetsaas.com');
    expect(config.binance.holderName).toBe('devjuand');
    expect(DEFAULT_PAYMENT_METHODS_CONFIG.pagoMovil.enabled).toBe(true);
  });

  it('valida el PIN secreto administrativo X1X-Y24 y rechaza PINs inválidos', async () => {
    expect(ADMIN_SECRET_PIN).toBe('X1X-Y24');
    expect(verifyAdminPin('X1X-Y24')).toBe(true);
    expect(verifyAdminPin('x1x-y24')).toBe(true);
    expect(verifyAdminPin('000-000')).toBe(false);
    expect(verifyAdminPin('')).toBe(false);

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ valid: true }),
    } as Response);

    const okRes = await verifyAdminSecretPin('X1X-Y24');
    expect(okRes.valid).toBe(true);

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ valid: false }),
    } as Response);

    const badRes = await verifyAdminSecretPin('WRONG-PIN');
    expect(badRes.valid).toBe(false);
  });
});
