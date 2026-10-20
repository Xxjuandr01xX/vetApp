'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge, Label, TextInput, Select, Alert, Spinner } from 'flowbite-react';
import { HiCheck, HiStar, HiShieldCheck, HiCreditCard, HiUpload, HiArrowLeft } from 'react-icons/hi';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBcvRates } from '@/lib/hooks/useBcvRates';
import { calcVES, formatVES } from '@/lib/utils/currency';
import { submitPaymentRequest, getLatestUserPaymentRequest, uploadPaymentCapture } from '@/lib/services/payments';
import {
  getPaymentMethodsConfig,
  PaymentMethodsConfig,
  DEFAULT_PAYMENT_METHODS_CONFIG,
} from '@/lib/services/admin-panel';
import { PaymentPlan, PaymentMethod, PaymentRequest } from '@/lib/types/payment';
import { PLAN_LIMITS } from '@/lib/constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PricingPage() {
  const { user, profile } = useAuth();
  const { rates } = useBcvRates();

  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>('premium_monthly');
  const [method, setMethod] = useState<PaymentMethod>('pago_movil');
  const [reference, setReference] = useState('');
  const [captureFile, setCaptureFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingRequest, setExistingRequest] = useState<PaymentRequest | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentMethodsConfig>(
    DEFAULT_PAYMENT_METHODS_CONFIG
  );

  const isPremium = profile?.role === 'premium' || profile?.role === 'admin';
  const usdRate = rates?.usd || 0;

  const planAmountUSD = selectedPlan === 'premium_yearly'
    ? PLAN_LIMITS.PREMIUM_YEARLY_USD
    : PLAN_LIMITS.PREMIUM_PRICE_USD;

  const planAmountVES = calcVES(planAmountUSD, usdRate);

  useEffect(() => {
    getPaymentMethodsConfig()
      .then((cfg) => {
        setPaymentConfig(cfg);
        if (!cfg.pagoMovil.enabled && cfg.binance.enabled) {
          setMethod('binance');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getLatestUserPaymentRequest(user.uid)
      .then((req) => setExistingRequest(req))
      .finally(() => setLoading(false));
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCaptureFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!reference.trim()) {
      setError('Por favor ingresa el número de referencia del pago');
      return;
    }

    if (!captureFile && !previewUrl) {
      setError('Por favor adjunta la captura o comprobante de la transferencia');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 1. Subir captura
      let captureUrl = previewUrl;
      if (captureFile) {
        captureUrl = await uploadPaymentCapture(captureFile);
      }

      // 2. Obtener idToken para autenticar
      const idToken = await user.getIdToken();

      // 3. Enviar solicitud
      const res = await submitPaymentRequest(
        {
          userId: user.uid,
          userName: profile?.displayName || user.displayName || 'Veterinario',
          userEmail: user.email || '',
          plan: selectedPlan,
          amount: planAmountUSD,
          currency: 'USD',
          method,
          reference: reference.trim(),
          captureUrl,
        },
        idToken
      );

      if (res.success) {
        setSuccess('¡Solicitud enviada con éxito! El administrador verificará tu pago y activará tu plan Premium.');
        setReference('');
        setCaptureFile(null);
        setPreviewUrl('');
        // Recargar estado
        getLatestUserPaymentRequest(user.uid).then(setExistingRequest);
      } else {
        setError(res.error || 'No se pudo registrar la solicitud de pago.');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado al procesar el pago.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-24 sm:pb-12 max-w-4xl mx-auto space-y-8">
      {/* Encabezado */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <HiArrowLeft className="mr-1 h-4 w-4" /> Volver al Inicio
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Planes y Suscripción VetApp ⭐
        </h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          Desbloquea pacientes ilimitados, récipe clínico personalizado y cálculo de dosis farmacológicas.
        </p>
      </div>

      {/* Alerta de estado actual */}
      {isPremium ? (
        <Alert color="success" icon={HiStar}>
          <span className="font-bold">¡Tu cuenta es Premium activa!</span>
          <p className="text-xs mt-1">
            Tienes acceso ilimitado a todas las herramientas avanzadas.
            {profile?.premiumUntil && (
              <span className="block mt-0.5">
                Vigencia hasta:{' '}
                {format(
                  profile.premiumUntil instanceof Date
                    ? profile.premiumUntil
                    : (profile.premiumUntil as any).toDate(),
                  "d 'de' MMMM, yyyy",
                  { locale: es }
                )}
              </span>
            )}
          </p>
        </Alert>
      ) : existingRequest?.status === 'pending' ? (
        <Alert color="warning">
          <span className="font-bold">Solicitud de Pago en Verificación</span>
          <p className="text-xs mt-1">
            Ya hemos recibido tu comprobante (Ref: <strong>{existingRequest.reference}</strong>). El administrador está verificando la transacción. Recibirás tu activación en breve.
          </p>
        </Alert>
      ) : existingRequest?.status === 'rejected' ? (
        <Alert color="failure">
          <span className="font-bold">Última solicitud rechazada</span>
          <p className="text-xs mt-1">
            Motivo: {existingRequest.reason || 'Comprobante no válido o no verificado'}. Puedes enviar un nuevo comprobante abajo.
          </p>
        </Alert>
      ) : null}

      {/* Comparativa de Planes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plan Gratuito */}
        <Card className={`border-2 ${!isPremium ? 'border-gray-300' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-gray-800">Plan Básico</h3>
            <Badge color="gray">Gratis</Badge>
          </div>
          <div className="text-3xl font-extrabold text-gray-900 mb-4">
            $0 <span className="text-sm font-normal text-gray-500">/ siempre</span>
          </div>
          <ul className="space-y-2.5 text-sm text-gray-600 mb-6">
            <li className="flex items-center gap-2">
              <HiCheck className="text-green-500 h-5 w-5 shrink-0" />
              <span>Hasta <strong>30 pacientes</strong> registrados</span>
            </li>
            <li className="flex items-center gap-2">
              <HiCheck className="text-green-500 h-5 w-5 shrink-0" />
              <span>Agenda y gestión de citas</span>
            </li>
            <li className="flex items-center gap-2">
              <HiCheck className="text-green-500 h-5 w-5 shrink-0" />
              <span>Acceso al Vademécum básico</span>
            </li>
            <li className="flex items-center gap-2">
              <HiCheck className="text-green-500 h-5 w-5 shrink-0" />
              <span>Récipes médicos en PDF y WhatsApp</span>
            </li>
          </ul>
          <Button color="light" disabled className="w-full">
            {!isPremium ? 'Tu plan actual' : 'Plan Base'}
          </Button>
        </Card>

        {/* Plan Premium */}
        <Card className="border-2 border-vet-primary shadow-lg relative overflow-hidden bg-gradient-to-b from-blue-50/20 to-white">
          <div className="absolute top-0 right-0 bg-vet-primary text-white text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-bl-lg">
            Recomendado
          </div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-vet-primary flex items-center gap-1.5">
              <span>⭐</span> Plan Premium
            </h3>
            <Badge color="success">Profesional</Badge>
          </div>
          <div className="mb-4">
            <div className="text-3xl font-extrabold text-gray-900">
              ${planAmountUSD}{' '}
              <span className="text-sm font-normal text-gray-500">
                / {selectedPlan === 'premium_yearly' ? 'año (ahorras $24)' : 'mes'}
              </span>
            </div>
            {usdRate > 0 && (
              <p className="text-xs text-emerald-700 font-semibold mt-1">
                Equivalente oficial: {formatVES(planAmountVES)} (Tasa BCV: {formatVES(usdRate)})
              </p>
            )}
          </div>
          <ul className="space-y-2.5 text-sm text-gray-700 mb-6">
            <li className="flex items-center gap-2">
              <HiCheck className="text-emerald-500 h-5 w-5 shrink-0" />
              <span><strong>Pacientes Ilimitados</strong> (sin restricciones)</span>
            </li>
            <li className="flex items-center gap-2">
              <HiCheck className="text-emerald-500 h-5 w-5 shrink-0" />
              <span>Fármacos y dosis personalizadas</span>
            </li>
            <li className="flex items-center gap-2">
              <HiCheck className="text-emerald-500 h-5 w-5 shrink-0" />
              <span>Calculadora automática de dosis según peso</span>
            </li>
            <li className="flex items-center gap-2">
              <HiCheck className="text-emerald-500 h-5 w-5 shrink-0" />
              <span>Trazabilidad de precios en Dólares y Bolívares</span>
            </li>
            <li className="flex items-center gap-2">
              <HiCheck className="text-emerald-500 h-5 w-5 shrink-0" />
              <span>Soporte prioritario para veterinarios</span>
            </li>
          </ul>
          {!isPremium && (
            <a href="#payment-form">
              <Button className="w-full bg-vet-primary hover:bg-vet-primary/90 font-bold">
                Activar Plan Premium
              </Button>
            </a>
          )}
        </Card>
      </div>

      {/* Formulario de Pago */}
      {!isPremium && (
        <Card id="payment-form" className="shadow-md">
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <HiCreditCard className="text-vet-primary h-6 w-6" />
              Realizar Pago y Notificar Transferencia
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Aceptamos Pago Móvil en Bolívares (tasa oficial BCV) y USDT vía Binance Pay.
            </p>
          </div>

          {error && <Alert color="failure">{error}</Alert>}
          {success && <Alert color="success">{success}</Alert>}

          <form onSubmit={handleSubmitPayment} className="space-y-6 pt-2">
            {/* 1. Selección de Período */}
            <div>
              <Label value="1. Selecciona el período de suscripción" className="mb-2 block font-semibold text-gray-700" />
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setSelectedPlan('premium_monthly')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedPlan === 'premium_monthly'
                      ? 'border-vet-primary bg-blue-50/30'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-bold text-gray-800 text-sm">Mensual</p>
                  <p className="text-lg font-extrabold text-vet-primary">$12 USD</p>
                  <p className="text-xs text-gray-500">Facturación cada 30 días</p>
                </div>

                <div
                  onClick={() => setSelectedPlan('premium_yearly')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all relative ${
                    selectedPlan === 'premium_yearly'
                      ? 'border-vet-primary bg-blue-50/30'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="absolute top-2 right-2 bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    2 meses gratis
                  </span>
                  <p className="font-bold text-gray-800 text-sm">Anual</p>
                  <p className="text-lg font-extrabold text-vet-primary">$120 USD</p>
                  <p className="text-xs text-gray-500">12 meses de acceso</p>
                </div>
              </div>
            </div>

            {/* 2. Método de Pago y Datos de Cuenta */}
            <div>
              <Label value="2. Método de pago" className="mb-2 block font-semibold text-gray-700" />
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              >
                {paymentConfig.pagoMovil.enabled && (
                  <option value="pago_movil">Pago Móvil (Bolívares - Tasa BCV)</option>
                )}
                {paymentConfig.binance.enabled && (
                  <option value="binance">Binance Pay (USDT)</option>
                )}
              </Select>

              {/* Datos de transferencia según método configurados en /panel */}
              <div className="mt-3 p-4 bg-gray-50 border rounded-xl text-xs space-y-1.5 text-gray-700">
                {method === 'pago_movil' ? (
                  <>
                    <p className="font-bold text-sm text-gray-900 mb-2">📲 Coordenadas de Pago Móvil:</p>
                    <p>• <strong>Banco:</strong> {paymentConfig.pagoMovil.bank}</p>
                    <p>• <strong>Teléfono:</strong> {paymentConfig.pagoMovil.phone}</p>
                    <p>• <strong>Cédula / RIF:</strong> {paymentConfig.pagoMovil.idDocument}</p>
                    {paymentConfig.pagoMovil.holderName && (
                      <p>• <strong>Titular:</strong> {paymentConfig.pagoMovil.holderName}</p>
                    )}
                    <p className="pt-1.5 border-t text-emerald-800 font-bold text-sm">
                      Monto a transferir: {formatVES(planAmountVES)}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Calculado a tasa BCV del día: {formatVES(usdRate)} por USD.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-sm text-gray-900 mb-2">🟡 Coordenadas de Binance Pay:</p>
                    {paymentConfig.binance.payId && (
                      <p>• <strong>Binance Pay ID:</strong> {paymentConfig.binance.payId}</p>
                    )}
                    {paymentConfig.binance.email && (
                      <p>• <strong>Email Binance:</strong> {paymentConfig.binance.email}</p>
                    )}
                    {paymentConfig.binance.holderName && (
                      <p>• <strong>Titular / Alias:</strong> {paymentConfig.binance.holderName}</p>
                    )}
                    {paymentConfig.binance.notes && (
                      <p className="text-[11px] text-gray-600">{paymentConfig.binance.notes}</p>
                    )}
                    <p className="pt-1.5 border-t text-emerald-800 font-bold text-sm">
                      Monto a transferir: ${planAmountUSD}.00 USDT
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* 3. Comprobante y Referencia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ref" value="3. Número de Referencia *" className="mb-1 block font-semibold text-gray-700" />
                <TextInput
                  id="ref"
                  placeholder="Ej. 12345678 (últimos dígitos)"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="capture" value="4. Captura de la transferencia *" className="mb-1 block font-semibold text-gray-700" />
                <input
                  id="capture"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-vet-primary hover:file:bg-blue-100"
                  required={!previewUrl}
                />
              </div>
            </div>

            {/* Preview de imagen */}
            {previewUrl && (
              <div className="border rounded-lg p-2 max-w-xs">
                <p className="text-[11px] text-gray-500 mb-1">Vista previa del comprobante:</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Comprobante de pago"
                  className="h-32 object-contain rounded bg-gray-100"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-vet-primary hover:bg-vet-primary/90 text-white font-bold"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Enviando comprobante...
                </>
              ) : (
                'Enviar Comprobante para Activación'
              )}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
