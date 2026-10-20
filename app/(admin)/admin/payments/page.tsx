'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Button, Badge, Modal, TextInput, Alert, Spinner, Tabs } from 'flowbite-react';
import {
  HiCheck,
  HiX,
  HiEye,
  HiCreditCard,
  HiExclamationCircle,
  HiRefresh,
  HiClock,
} from 'react-icons/hi';
import {
  getPaymentRequests,
  approvePaymentRequest,
  rejectPaymentRequest,
} from '@/lib/services/payments';
import { PaymentRequest, PaymentStatus } from '@/lib/types/payment';
import { formatVES } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function PaymentsManagementContent() {
  const searchParams = useSearchParams();
  const highlightedReqId = searchParams.get('reqId');

  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');

  // Modal de imagen de comprobante
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Modal de rechazo
  const [rejectModalReq, setRejectModalReq] = useState<PaymentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Estados de mutación
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getPaymentRequests();
      setRequests(data);
    } catch (err) {
      console.error('Error cargando pagos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (req: PaymentRequest) => {
    if (!req.id) return;
    if (!window.confirm(`¿Aprobar el pago de ${req.userName} por $${req.amount} USD? Se activará su membresía Premium.`)) {
      return;
    }

    setActionLoadingId(req.id);
    setFeedback(null);

    try {
      const res = await approvePaymentRequest(req.id);

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Pago aprobado. ${req.userName} ahora tiene acceso Premium activo.`,
        });
        await loadRequests();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Error al aprobar la solicitud.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error de conexión' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalReq?.id) return;
    if (!rejectReason.trim()) {
      alert('Debes ingresar un motivo de rechazo.');
      return;
    }

    setActionLoadingId(rejectModalReq.id);
    setFeedback(null);

    try {
      const res = await rejectPaymentRequest({
        requestId: rejectModalReq.id,
        reason: rejectReason.trim(),
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `La solicitud de ${rejectModalReq.userName} ha sido rechazada.`,
        });
        setRejectModalReq(null);
        setRejectReason('');
        await loadRequests();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Error al rechazar la solicitud.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error de conexión' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'all') return true;
    return r.status === activeTab;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Título y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2">
            <span>💳</span> Solicitudes de Pago y Suscripciones
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Revisa transferencias recibidas. Al aprobar, el usuario recibe 30 días (o 365 días) de acceso Premium automático.
          </p>
        </div>

        <Button
          size="sm"
          color="light"
          onClick={loadRequests}
          disabled={loading}
          className="self-start sm:self-auto"
        >
          <HiRefresh className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {feedback && (
        <Alert
          color={feedback.type === 'success' ? 'success' : 'failure'}
          onDismiss={() => setFeedback(null)}
        >
          {feedback.message}
        </Alert>
      )}

      {/* Selector de pestañas */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span>Pendientes</span>
          {pendingCount > 0 && (
            <Badge color="warning" size="xs">{pendingCount}</Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'approved'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Aprobados
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'rejected'
              ? 'bg-red-100 text-red-900 border border-red-300'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Rechazados
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'all'
              ? 'bg-gray-800 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Todos ({requests.length})
        </button>
      </div>

      {/* Lista de solicitudes */}
      {loading ? (
        <div className="text-center py-16">
          <Spinner size="xl" color="purple" />
          <p className="text-xs text-gray-500 mt-2">Cargando solicitudes de pago...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300 p-8">
          <span className="text-4xl block mb-2">🎉</span>
          <p className="text-gray-600 font-semibold">No hay solicitudes en esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isHighlighted = req.id === highlightedReqId;
            const isPending = req.status === 'pending';
            const isActionLoading = actionLoadingId === req.id;

            const dateStr = req.createdAt
              ? format(
                  req.createdAt instanceof Date
                    ? req.createdAt
                    : (req.createdAt as any)?.toDate
                    ? (req.createdAt as any).toDate()
                    : new Date(),
                  "d 'de' MMMM, yyyy • HH:mm",
                  { locale: es }
                )
              : 'Reciente';

            return (
              <Card
                key={req.id}
                className={`transition-all ${
                  isHighlighted ? 'ring-2 ring-purple-600 bg-purple-50/20' : ''
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Información del usuario y plan */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-base">
                        {req.userName}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{req.userEmail}</span>
                      <Badge
                        color={
                          req.status === 'approved'
                            ? 'success'
                            : req.status === 'rejected'
                            ? 'failure'
                            : 'warning'
                        }
                      >
                        {req.status === 'approved'
                          ? 'Aprobado'
                          : req.status === 'rejected'
                          ? 'Rechazado'
                          : 'Pendiente'}
                      </Badge>
                      {req.plan === 'premium_yearly' && (
                        <Badge color="purple">Plan Anual</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs text-gray-600">
                      <div>
                        <span className="text-gray-400 block text-[11px]">Monto:</span>
                        <strong className="text-gray-900 text-sm">
                          ${req.amount} {req.currency}
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Método:</span>
                        <strong className="capitalize">
                          {req.method === 'pago_movil' ? 'Pago Móvil' : 'Binance Pay'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Referencia:</span>
                        <code className="bg-gray-100 px-1 py-0.5 rounded font-mono font-bold text-gray-800">
                          {req.reference}
                        </code>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Fecha:</span>
                        <span>{dateStr}</span>
                      </div>
                    </div>

                    {req.reason && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                        <strong>Motivo de rechazo:</strong> {req.reason}
                      </div>
                    )}
                  </div>

                  {/* Acciones y Comprobante */}
                  <div className="flex items-center gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0">
                    {/* Botón Ver Comprobante */}
                    {req.captureUrl && (
                      <Button
                        size="xs"
                        color="light"
                        onClick={() => setPreviewImage(req.captureUrl)}
                        title="Ver comprobante de pago"
                      >
                        <HiEye className="mr-1 h-3.5 w-3.5" /> Comprobante
                      </Button>
                    )}

                    {/* Botones de Aprobación / Rechazo si está pendiente */}
                    {isPending && (
                      <>
                        <Button
                          size="xs"
                          color="success"
                          disabled={isActionLoading}
                          onClick={() => handleApprove(req)}
                        >
                          {isActionLoading ? (
                            <Spinner size="xs" className="mr-1" />
                          ) : (
                            <HiCheck className="mr-1 h-4 w-4" />
                          )}
                          Aprobar
                        </Button>

                        <Button
                          size="xs"
                          color="failure"
                          disabled={isActionLoading}
                          onClick={() => {
                            setRejectModalReq(req);
                            setRejectReason('');
                          }}
                        >
                          <HiX className="mr-1 h-4 w-4" /> Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Vista Previa de Comprobante */}
      <Modal
        show={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        size="lg"
      >
        <Modal.Header>Comprobante de Transferencia</Modal.Header>
        <Modal.Body>
          {previewImage && (
            <div className="flex justify-center bg-gray-100 p-2 rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt="Comprobante"
                className="max-h-[500px] object-contain rounded"
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setPreviewImage(null)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Rechazo de Solicitud */}
      <Modal
        show={Boolean(rejectModalReq)}
        onClose={() => setRejectModalReq(null)}
      >
        <Modal.Header>Rechazar Solicitud de Pago</Modal.Header>
        <Modal.Body className="space-y-4">
          <p className="text-sm text-gray-600">
            Indica el motivo por el cual no se pudo validar la transferencia de{' '}
            <strong>{rejectModalReq?.userName}</strong> (Ref: {rejectModalReq?.reference}).
          </p>
          <div>
            <TextInput
              placeholder="Ej. Referencia no coincide con estado de cuenta bancario..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="failure" onClick={handleRejectConfirm}>
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

export default function AdminPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-16">
          <Spinner size="lg" color="purple" />
        </div>
      }
    >
      <PaymentsManagementContent />
    </Suspense>
  );
}
