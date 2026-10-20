/**
 * Módulo de notificaciones vía Telegram Bot API (RF-24).
 * Notifica registros de nuevos usuarios y solicitudes de pago al administrador.
 */

const DEFAULT_TELEGRAM_BOT_TOKEN = '8898310395:AAHZeZrz5HNx8sJXBIG2iNr9KnGd9n_MYnA';
const DEFAULT_TELEGRAM_CHAT_ID = '1677399010';

function getTelegramCredentials() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID || DEFAULT_TELEGRAM_CHAT_ID,
  };
}

/**
 * Envía una notificación por Telegram cuando un nuevo usuario se registra en la plataforma.
 */
export async function notifyTelegramNewUser(payload: {
  uid: string;
  displayName: string;
  email: string;
  role?: string;
  registeredAt?: string;
}): Promise<boolean> {
  const { token, chatId } = getTelegramCredentials();

  if (!token || !chatId) {
    console.warn('TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados. Omitiendo notificación Telegram.');
    return false;
  }

  const origin = (process.env.ALLOWED_ORIGIN || 'http://localhost:3000').split(',')[0];
  const panelUrl = `${origin}/panel`;
  const dateStr =
    payload.registeredAt ||
    new Date().toLocaleString('es-VE', {
      timeZone: 'America/Caracas',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  const roleLabel = payload.role === 'premium' ? '⭐ Premium' : 'Gratis (Básico)';

  const text =
    `🆕 *Nuevo Usuario Registrado en VetApp*\n\n` +
    `👤 *Nombre:* ${payload.displayName}\n` +
    `📧 *Email:* ${payload.email}\n` +
    `🆔 *UID:* \`${payload.uid}\`\n` +
    `🏷️ *Plan Inicial:* ${roleLabel}\n` +
    `📅 *Fecha:* ${dateStr}\n\n` +
    `🔗 [Aprobar / Gestionar en /panel](${panelUrl})`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    return res.ok;
  } catch (err) {
    console.error('Error enviando notificación de nuevo registro a Telegram:', err);
    return false;
  }
}

/**
 * Envía una notificación por Telegram cuando un usuario reporta un pago.
 */
export async function notifyTelegramPayment(payload: {
  reqId: string;
  userName: string;
  userEmail: string;
  plan: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  captureUrl: string;
}): Promise<boolean> {
  const { token, chatId } = getTelegramCredentials();

  if (!token || !chatId) {
    console.warn('TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados. Omitiendo notificación Telegram.');
    return false;
  }

  const origin = (process.env.ALLOWED_ORIGIN || 'http://localhost:3000').split(',')[0];
  const adminUrl = `${origin}/panel?reqId=${payload.reqId}`;

  const planLabel = payload.plan === 'premium_yearly' ? 'Plan Anual ($120/año)' : 'Plan Mensual ($12/mes)';
  const methodLabel = payload.method === 'pago_movil' ? 'Pago Móvil (Bs.)' : 'Binance Pay (USDT)';

  const caption =
    `💰 *Nueva Solicitud de Pago*\n\n` +
    `👤 *Usuario:* ${payload.userName}\n` +
    `📧 *Email:* ${payload.userEmail}\n` +
    `📦 *Plan:* ${planLabel}\n` +
    `💵 *Monto:* $${payload.amount} ${payload.currency}\n` +
    `🏦 *Método:* ${methodLabel}\n` +
    `🔢 *Referencia:* \`${payload.reference}\`\n\n` +
    `🔗 [Abrir Panel Administrativo (/panel)](${adminUrl})`;

  try {
    if (payload.captureUrl && payload.captureUrl.startsWith('http')) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: payload.captureUrl,
          caption,
          parse_mode: 'Markdown',
        }),
      });

      if (res.ok) return true;
    }

    // Fallback con sendMessage si sendPhoto falla o no es URL directa
    const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: caption,
        parse_mode: 'Markdown',
      }),
    });

    return msgRes.ok;
  } catch (err) {
    console.error('Error enviando notificación a Telegram:', err);
    return false;
  }
}
