'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Badge,
  Spinner,
  Alert,
  TextInput,
  Label,
  Select,
  Textarea,
  ToggleSwitch,
  Modal,
} from 'flowbite-react';
import {
  HiUsers,
  HiCreditCard,
  HiStar,
  HiCheck,
  HiX,
  HiSearch,
  HiRefresh,
  HiPaperAirplane,
  HiEye,
  HiSave,
  HiShieldCheck,
} from 'react-icons/hi';
import {
  getAdminUsers,
  updateUserSubscriptionRole,
  getPaymentMethodsConfig,
  savePaymentMethodsConfig,
  sendTestTelegramNotification,
  AdminUserRecord,
  PaymentMethodsConfig,
  DEFAULT_PAYMENT_METHODS_CONFIG,
} from '@/lib/services/admin-panel';
import {
  getPaymentRequests,
  approvePaymentRequest,
  rejectPaymentRequest,
} from '@/lib/services/payments';
import { PaymentRequest } from '@/lib/types/payment';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type PanelTab = 'users' | 'payment_settings' | 'payment_requests';

function formatAnyDate(val: any): string {
  if (!val) return '—';
  try {
    const date =
      val instanceof Date
        ? val
        : typeof val === 'number'
        ? new Date(val)
        : typeof val.toDate === 'function'
        ? val.toDate()
        : new Date(val);
    if (isNaN(date.getTime())) return '—';
    return format(date, "d MMM yyyy, HH:mm", { locale: es });
  } catch {
    return '—';
  }
}

export default function AdminPanelPage() {
  const [activeTab, setActiveTab] = useState<PanelTab>('users');
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentMethodsConfig>(
    DEFAULT_PAYMENT_METHODS_CONFIG
  );

  const [loadingData, setLoadingData] = useState(true);
  const [processingUid, setProcessingUid] = useState<string | null>(null);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  // Filtros de usuarios
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'free' | 'premium' | 'admin'>('all');
  const [selectedDurationByUid, setSelectedDurationByUid] = useState<Record<string, number>>({});

  // Mensajes de feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'failure'; message: string } | null>(
    null
  );

  // Modal de comprobante / rechazo
  const [previewCapture, setPreviewCapture] = useState<PaymentRequest | null>(null);
  const [rejectModalReq, setRejectModalReq] = useState<PaymentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadAllPanelData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [usersData, paymentsData, configData] = await Promise.all([
        getAdminUsers(),
        getPaymentRequests(),
        getPaymentMethodsConfig(),
      ]);
      setUsers(usersData);
      setPayments(paymentsData);
      setPaymentConfig(configData);
    } catch (err) {
      console.error('Error cargando datos de /panel:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadAllPanelData();
  }, [loadAllPanelData]);

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, roleFilter]);

  const premiumUsersCount = useMemo(
    () => users.filter((u) => u.role === 'premium').length,
    [users]
  );

  const pendingPayments = useMemo(
    () => payments.filter((p) => p.status === 'pending'),
    [payments]
  );

  // Cambiar modo de usuario (Aprobar Premium / Pasar a Gratis)
  const handleToggleUserRole = async (
    targetUser: AdminUserRecord,
    newRole: 'free' | 'premium'
  ) => {
    setProcessingUid(targetUser.uid);
    setFeedback(null);

    const durationDays = selectedDurationByUid[targetUser.uid] || 30;

    try {
      const res = await updateUserSubscriptionRole({
        targetUid: targetUser.uid,
        role: newRole,
        durationDays,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message:
            newRole === 'premium'
              ? `✅ Modo Premium aprobado para ${targetUser.displayName} (${targetUser.email}) por ${durationDays} días.`
              : `Usuario ${targetUser.displayName} cambiado a Plan Gratis.`,
        });
        await loadAllPanelData();
      } else {
        setFeedback({
          type: 'failure',
          message: res.error || 'No se pudo actualizar el modo del usuario.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'failure',
        message: err?.message || 'Error al actualizar el usuario.',
      });
    } finally {
      setProcessingUid(null);
    }
  };

  // Guardar datos de Pago Móvil y Binance
  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !paymentConfig.pagoMovil.bank.trim() ||
      !paymentConfig.pagoMovil.phone.trim() ||
      !paymentConfig.pagoMovil.idDocument.trim()
    ) {
      setFeedback({
        type: 'failure',
        message: 'Por favor completa Banco, Teléfono y Cédula/RIF para Pago Móvil.',
      });
      return;
    }

    setSavingConfig(true);
    setFeedback(null);

    try {
      const res = await savePaymentMethodsConfig({
        pagoMovil: paymentConfig.pagoMovil,
        binance: paymentConfig.binance,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message:
            '✅ Datos de Pago Móvil y Binance guardados correctamente. Ya están visibles en la página de pago (/pricing).',
        });
      } else {
        setFeedback({
          type: 'failure',
          message: res.error || 'No se pudo guardar la configuración de pagos.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'failure',
        message: err?.message || 'Error inesperado al guardar los datos de pago.',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  // Aprobar solicitud de pago desde /panel
  const handleApprovePayment = async (req: PaymentRequest) => {
    if (!req.id) return;
    setProcessingPaymentId(req.id);
    setFeedback(null);

    try {
      const res = await approvePaymentRequest(req.id);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `✅ Pago de ${req.userName} aprobado. Su cuenta ahora está en modo Premium.`,
        });
        await loadAllPanelData();
      } else {
        setFeedback({
          type: 'failure',
          message: res.error || 'Error al aprobar el pago.',
        });
      }
    } finally {
      setProcessingPaymentId(null);
    }
  };

  // Rechazar solicitud de pago
  const handleRejectPayment = async () => {
    if (!rejectModalReq?.id) return;
    if (rejectReason.trim().length < 5) {
      setFeedback({
        type: 'failure',
        message: 'Indica un motivo de rechazo de al menos 5 caracteres.',
      });
      return;
    }

    const reqId = rejectModalReq.id;
    setProcessingPaymentId(reqId);
    setFeedback(null);

    try {
      const res = await rejectPaymentRequest({
        requestId: reqId,
        reason: rejectReason.trim(),
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Solicitud de ${rejectModalReq.userName} marcada como rechazada.`,
        });
        setRejectModalReq(null);
        setRejectReason('');
        await loadAllPanelData();
      } else {
        setFeedback({
          type: 'failure',
          message: res.error || 'Error al rechazar la solicitud.',
        });
      }
    } finally {
      setProcessingPaymentId(null);
    }
  };

  // Probar notificación de Telegram
  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setFeedback(null);
    try {
      const res = await sendTestTelegramNotification('Administrador VetApp (/panel)');
      if (res.success) {
        setFeedback({
          type: 'success',
          message:
            '📲 Mensaje de prueba enviado al Bot de Telegram (Chat ID: 1677399010 - @devjuand).',
        });
      } else {
        setFeedback({
          type: 'failure',
          message: res.error || 'No se pudo enviar el mensaje de prueba a Telegram.',
        });
      }
    } finally {
      setTestingTelegram(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2">
            <span>👑</span> Panel Administrativo (/panel)
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Aprueba qué usuarios utilizan el modo Premium y configura los datos de Pago Móvil y Binance Pay.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            color="light"
            size="sm"
            onClick={handleTestTelegram}
            disabled={testingTelegram}
          >
            {testingTelegram ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <HiPaperAirplane className="mr-1.5 h-4 w-4 text-sky-600 rotate-45" />
            )}
            Probar Bot Telegram
          </Button>

          <Button color="light" size="sm" onClick={loadAllPanelData} disabled={loadingData}>
            <HiRefresh className={`mr-1.5 h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Feedback de Acciones */}
      {feedback && (
        <Alert
          color={feedback.type}
          onDismiss={() => setFeedback(null)}
          className="font-medium shadow-xs"
        >
          {feedback.message}
        </Alert>
      )}

      {/* Resumen de Métricas y Estado del Bot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Usuarios Registrados</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">
                {loadingData ? '...' : users.length}
              </p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
              <HiUsers className="h-6 w-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Notificados vía Telegram al registrarse</p>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Usuarios Modo Premium</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                {loadingData ? '...' : premiumUsersCount}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
              <HiStar className="h-6 w-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Suscripciones activas actualmente</p>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Pagos por Verificar</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">
                {loadingData ? '...' : pendingPayments.length}
              </p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
              <HiCreditCard className="h-6 w-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Solicitudes de Pago Móvil / Binance</p>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Bot de Telegram</p>
              <p className="text-sm font-extrabold text-sky-700 mt-1 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                Activo (@devjuand)
              </p>
            </div>
            <div className="p-2.5 bg-sky-50 rounded-xl text-sky-600">
              <HiPaperAirplane className="h-6 w-6 rotate-45" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Chat ID: 1677399010 (Juan D. Rincón)</p>
        </Card>
      </div>

      {/* Selector de Pestañas del Panel */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <Button
          size="sm"
          color={activeTab === 'users' ? 'blue' : 'light'}
          onClick={() => setActiveTab('users')}
        >
          <HiUsers className="mr-1.5 h-4 w-4" />
          1. Aprobar Usuarios Modo Premium ({users.length})
        </Button>

        <Button
          size="sm"
          color={activeTab === 'payment_settings' ? 'blue' : 'light'}
          onClick={() => setActiveTab('payment_settings')}
        >
          <HiCreditCard className="mr-1.5 h-4 w-4" />
          2. Configurar Datos Pago Móvil y Binance
        </Button>

        <Button
          size="sm"
          color={activeTab === 'payment_requests' ? 'blue' : 'light'}
          onClick={() => setActiveTab('payment_requests')}
        >
          <HiShieldCheck className="mr-1.5 h-4 w-4" />
          3. Solicitudes de Pago ({pendingPayments.length} pendientes)
        </Button>
      </div>

      {/* PESTAÑA 1: GESTIÓN DE USUARIOS Y APROBACIÓN DE MODO PREMIUM */}
      {activeTab === 'users' && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Usuarios Registrados y Aprobación de Modo Premium
              </h2>
              <p className="text-xs text-gray-500">
                Activa o desactiva el modo Premium directamente para cualquier veterinario registrado.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <TextInput
                icon={HiSearch}
                placeholder="Buscar por nombre, email o UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sizing="sm"
                className="w-full sm:w-64"
              />
              <Select
                sizing="sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
              >
                <option value="all">Todos los planes</option>
                <option value="free">Solo Plan Gratis</option>
                <option value="premium">Solo Modo Premium</option>
                <option value="admin">Administradores</option>
              </Select>
            </div>
          </div>

          {loadingData ? (
            <div className="py-12 text-center">
              <Spinner size="lg" />
              <p className="text-xs text-gray-500 mt-2">Cargando usuarios registrados...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              No se encontraron usuarios con los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-4 py-3">Usuario / Veterinario</th>
                    <th className="px-4 py-3">Fecha Registro</th>
                    <th className="px-4 py-3">Modo Actual</th>
                    <th className="px-4 py-3">Vigencia Premium</th>
                    <th className="px-4 py-3">Duración a Otorgar</th>
                    <th className="px-4 py-3 text-right">Acción Modo Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((u) => {
                    const isUserPremium = u.role === 'premium';
                    const isUserAdmin = u.role === 'admin';
                    const duration = selectedDurationByUid[u.uid] || 30;

                    return (
                      <tr key={u.uid} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{u.displayName}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                          <p className="text-[10px] font-mono text-gray-400">UID: {u.uid}</p>
                        </td>

                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {formatAnyDate(u.createdAt)}
                        </td>

                        <td className="px-4 py-3">
                          {isUserAdmin ? (
                            <Badge color="purple" className="w-fit">
                              👑 Admin
                            </Badge>
                          ) : isUserPremium ? (
                            <Badge color="success" className="w-fit">
                              ⭐ Premium Activo
                            </Badge>
                          ) : (
                            <Badge color="gray" className="w-fit">
                              Gratis (Básico)
                            </Badge>
                          )}
                        </td>

                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {u.premiumUntil ? (
                            <span className="font-semibold text-emerald-700">
                              Hasta {formatAnyDate(u.premiumUntil)}
                            </span>
                          ) : (
                            <span className="text-gray-400">Sin fecha activa</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <Select
                            sizing="sm"
                            value={duration}
                            onChange={(e) =>
                              setSelectedDurationByUid((prev) => ({
                                ...prev,
                                [u.uid]: Number(e.target.value),
                              }))
                            }
                            disabled={processingUid === u.uid}
                            className="w-40"
                          >
                            <option value={30}>Mensual (30 días)</option>
                            <option value={90}>Trimestral (90 días)</option>
                            <option value={365}>Anual (365 días)</option>
                          </Select>
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              size="xs"
                              color="success"
                              disabled={processingUid === u.uid}
                              onClick={() => handleToggleUserRole(u, 'premium')}
                            >
                              {processingUid === u.uid ? (
                                <Spinner size="xs" className="mr-1" />
                              ) : (
                                <HiCheck className="mr-1 h-4 w-4" />
                              )}
                              {isUserPremium ? 'Renovar Premium' : 'Aprobar Premium'}
                            </Button>

                            {isUserPremium && (
                              <Button
                                size="xs"
                                color="light"
                                disabled={processingUid === u.uid}
                                onClick={() => handleToggleUserRole(u, 'free')}
                              >
                                <HiX className="mr-1 h-3.5 w-3.5 text-red-600" />
                                Quitar Premium
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* PESTAÑA 2: CONFIGURACIÓN DE DATOS DE PAGO MÓVIL Y BINANCE */}
      {activeTab === 'payment_settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <form onSubmit={handleSavePaymentConfig} className="space-y-6">
                <div className="border-b pb-3">
                  <h2 className="text-lg font-bold text-gray-900">
                    Datos de Pago Móvil y Binance para Usuarios
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Estos datos se mostrarán automáticamente en la página de suscripción (/pricing) para que los usuarios realicen sus pagos.
                  </p>
                </div>

                {/* Sección Pago Móvil */}
                <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <span>📲</span> Datos de Pago Móvil (Bolívares)
                    </h3>
                    <ToggleSwitch
                      checked={paymentConfig.pagoMovil.enabled}
                      label="Activo"
                      onChange={(checked) =>
                        setPaymentConfig((prev) => ({
                          ...prev,
                          pagoMovil: { ...prev.pagoMovil, enabled: checked },
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pm-bank" value="Banco y Código *" className="mb-1 block" />
                      <TextInput
                        id="pm-bank"
                        placeholder="Ej. Banesco (0134) o Mercantil (0105)"
                        value={paymentConfig.pagoMovil.bank}
                        onChange={(e) =>
                          setPaymentConfig((prev) => ({
                            ...prev,
                            pagoMovil: { ...prev.pagoMovil, bank: e.target.value },
                          }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="pm-phone" value="Teléfono Pago Móvil *" className="mb-1 block" />
                      <TextInput
                        id="pm-phone"
                        placeholder="Ej. 0414-1234567"
                        value={paymentConfig.pagoMovil.phone}
                        onChange={(e) =>
                          setPaymentConfig((prev) => ({
                            ...prev,
                            pagoMovil: { ...prev.pagoMovil, phone: e.target.value },
                          }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="pm-id" value="Cédula o RIF *" className="mb-1 block" />
                      <TextInput
                        id="pm-id"
                        placeholder="Ej. V-19.876.543 o J-12345678-9"
                        value={paymentConfig.pagoMovil.idDocument}
                        onChange={(e) =>
                          setPaymentConfig((prev) => ({
                            ...prev,
                            pagoMovil: { ...prev.pagoMovil, idDocument: e.target.value },
                          }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="pm-holder" value="Nombre del Titular / Beneficiario" className="mb-1 block" />
                      <TextInput
                        id="pm-holder"
                        placeholder="Ej. Juan D. Rincón U."
                        value={paymentConfig.pagoMovil.holderName}
                        onChange={(e) =>
                          setPaymentConfig((prev) => ({
                            ...prev,
                            pagoMovil: { ...prev.pagoMovil, holderName: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Sección Binance Pay */}
                <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <span>🟡</span> Datos de Binance Pay (USDT)
                    </h3>
                    <ToggleSwitch
                      checked={paymentConfig.binance.enabled}
                      label="Activo"
                      onChange={(checked) =>
                        setPaymentConfig((prev) => ({
                          ...prev,
                          binance: { ...prev.binance, enabled: checked },
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bn-payid" value="Binance Pay ID / UID *" className="mb-1 block" />
                      <TextInput
                        id="bn-payid"
                        placeholder="Ej. 123456789"
                        value={paymentConfig.binance.payId}
                        onChange={(e) =>
                          setPaymentConfig((prev) => ({
                            ...prev,
                            binance: { ...prev.binance, payId: e.target.value },
                          }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="bn-email" value="Correo de Binance *" className="mb-1 block" />
                      <TextInput
                        id="bn-email"
                        type="email"
                        placeholder="Ej. pagos@vetapp.com"
                        value={paymentConfig.binance.email}
                        onChange={(e) =>
                          setPaymentConfig((prev) => ({
                            ...prev,
                            binance: { ...prev.binance, email: e.target.value },
                          }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="bn-holder" value="Nombre / Alias en Binance" className="mb-1 block" />
                      <TextInput
                        id="bn-holder"
                        placeholder="Ej. devjuand / VetApp"
                        value={paymentConfig.binance.holderName}
                        onChange={(e) =>
                          setPaymentConfig((prev) => ({
                            ...prev,
                            binance: { ...prev.binance, holderName: e.target.value },
                          }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="bn-notes" value="Instrucciones adicionales" className="mb-1 block" />
                      <TextInput
                        id="bn-notes"
                        placeholder="Ej. Enviar USDT sin comisiones vía Binance Pay"
                        value={paymentConfig.binance.notes}
                        onChange={(e) =>
                          setPaymentConfig((prev) => ({
                            ...prev,
                            binance: { ...prev.binance, notes: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-vet-primary hover:bg-vet-primary/90 font-bold"
                  disabled={savingConfig}
                >
                  {savingConfig ? (
                    <>
                      <Spinner size="sm" className="mr-2" /> Guardando cambios...
                    </>
                  ) : (
                    <>
                      <HiSave className="mr-2 h-5 w-5" />
                      Guardar Datos de Pago Móvil y Binance
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </div>

          {/* Vista previa en tiempo real */}
          <div className="space-y-4">
            <Card className="bg-gray-50 border-dashed border-2 border-gray-300">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                👁️ Vista Previa en Página de Pago (/pricing)
              </h3>
              <p className="text-xs text-gray-500">
                Así verán los veterinarios tus datos al momento de reportar su pago:
              </p>

              <div className="p-3.5 bg-white border rounded-xl text-xs space-y-1.5 text-gray-700 shadow-2xs">
                <p className="font-bold text-sm text-gray-900 mb-1">
                  📲 Coordenadas de Pago Móvil:
                </p>
                <p>• <strong>Banco:</strong> {paymentConfig.pagoMovil.bank || '—'}</p>
                <p>• <strong>Teléfono:</strong> {paymentConfig.pagoMovil.phone || '—'}</p>
                <p>• <strong>Cédula / RIF:</strong> {paymentConfig.pagoMovil.idDocument || '—'}</p>
                {paymentConfig.pagoMovil.holderName && (
                  <p>• <strong>Titular:</strong> {paymentConfig.pagoMovil.holderName}</p>
                )}
              </div>

              <div className="p-3.5 bg-white border rounded-xl text-xs space-y-1.5 text-gray-700 shadow-2xs">
                <p className="font-bold text-sm text-gray-900 mb-1">
                  🟡 Coordenadas de Binance Pay:
                </p>
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
                  <p className="text-[11px] text-gray-500 pt-1 border-t">
                    {paymentConfig.binance.notes}
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: SOLICITUDES DE PAGO RECIBIDAS */}
      {activeTab === 'payment_requests' && (
        <Card>
          <div className="border-b pb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Solicitudes de Pago Recibidas
            </h2>
            <p className="text-xs text-gray-500">
              Al aprobar un comprobante, el usuario pasa automáticamente al modo Premium.
            </p>
          </div>

          {payments.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              No hay solicitudes de pago registradas todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Plan / Monto</th>
                    <th className="px-4 py-3">Método / Ref</th>
                    <th className="px-4 py-3">Comprobante</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((req) => (
                    <tr key={req.id} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900">{req.userName}</p>
                        <p className="text-xs text-gray-500">{req.userEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color="info" className="w-fit mb-1">
                          {req.plan === 'premium_yearly' ? 'Anual (12m)' : 'Mensual (30d)'}
                        </Badge>
                        <p className="font-extrabold text-gray-900">
                          ${req.amount} {req.currency}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold">
                          {req.method === 'pago_movil' ? '📲 Pago Móvil' : '🟡 Binance Pay'}
                        </p>
                        <p className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded w-fit mt-1">
                          Ref: {req.reference}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {req.captureUrl ? (
                          <Button
                            size="xs"
                            color="light"
                            onClick={() => setPreviewCapture(req)}
                          >
                            <HiEye className="mr-1 h-4 w-4" /> Ver Captura
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">Sin adjunto</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {req.status === 'pending' && <Badge color="warning">Pendiente</Badge>}
                        {req.status === 'approved' && <Badge color="success">Aprobado</Badge>}
                        {req.status === 'rejected' && <Badge color="failure">Rechazado</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === 'pending' ? (
                          <div className="inline-flex gap-2">
                            <Button
                              size="xs"
                              color="success"
                              disabled={processingPaymentId === req.id}
                              onClick={() => handleApprovePayment(req)}
                            >
                              <HiCheck className="mr-1 h-4 w-4" /> Aprobar Premium
                            </Button>
                            <Button
                              size="xs"
                              color="failure"
                              disabled={processingPaymentId === req.id}
                              onClick={() => {
                                setRejectModalReq(req);
                                setRejectReason('');
                              }}
                            >
                              <HiX className="mr-1 h-4 w-4" /> Rechazar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Procesado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal de vista previa de comprobante */}
      <Modal show={!!previewCapture} onClose={() => setPreviewCapture(null)} size="lg">
        <Modal.Header>
          Comprobante de {previewCapture?.userName} (Ref: {previewCapture?.reference})
        </Modal.Header>
        <Modal.Body>
          {previewCapture?.captureUrl && (
            <div className="flex justify-center bg-gray-100 p-3 rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewCapture.captureUrl}
                alt="Captura de pago"
                className="max-h-[65vh] object-contain rounded"
              />
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Modal de rechazo de solicitud */}
      <Modal show={!!rejectModalReq} onClose={() => setRejectModalReq(null)} size="md">
        <Modal.Header>Rechazar Solicitud de Pago</Modal.Header>
        <Modal.Body>
          <div className="space-y-3">
            <Label htmlFor="reject-reason" value="Motivo del rechazo *" />
            <Textarea
              id="reject-reason"
              rows={3}
              placeholder="Ej. Referencia no encontrada en el estado de cuenta"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            color="failure"
            onClick={handleRejectPayment}
            disabled={!!processingPaymentId}
          >
            Confirmar Rechazo
          </Button>
          <Button color="gray" onClick={() => setRejectModalReq(null)}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
