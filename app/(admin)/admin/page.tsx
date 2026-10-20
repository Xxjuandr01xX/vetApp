'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Button, Badge, Spinner } from 'flowbite-react';
import { HiCreditCard, HiUsers, HiBookOpen, HiChartBar, HiArrowRight } from 'react-icons/hi';
import { getPaymentRequests } from '@/lib/services/payments';
import { PaymentRequest } from '@/lib/types/payment';

export default function AdminDashboardPage() {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPaymentRequests()
      .then(setPayments)
      .finally(() => setLoading(false));
  }, []);

  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const approvedPayments = payments.filter((p) => p.status === 'approved');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
          Panel de Control Administrativo 👑
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Gestión central de suscripciones, pagos, usuarios y vademécum global.
        </p>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Pagos Pendientes</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">
                {loading ? '...' : pendingPayments.length}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <HiCreditCard className="h-6 w-6" />
            </div>
          </div>
          {pendingPayments.length > 0 && (
            <Link href="/admin/payments" className="mt-2 text-xs font-bold text-amber-600 hover:underline flex items-center gap-1">
              Revisar solicitudes <HiArrowRight className="h-3 w-3" />
            </Link>
          )}
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Pagos Aprobados</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">
                {loading ? '...' : approvedPayments.length}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <HiUsers className="h-6 w-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Suscripciones procesadas con éxito</p>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Catálogo Vademécum</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">100</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <HiBookOpen className="h-6 w-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Medicamentos precargados en el sistema</p>
        </Card>
      </div>

      {/* Acciones Administrativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-bold text-gray-900 border-b pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <HiCreditCard className="text-vet-primary" />
              Gestión de Pagos y Suscripciones
            </span>
            {pendingPayments.length > 0 && (
              <Badge color="warning">{pendingPayments.length} nuevos</Badge>
            )}
          </h2>
          <p className="text-sm text-gray-600">
            Revisa los comprobantes de transferencias recibidas por Pago Móvil o Binance. Al aprobar, el veterinario obtiene automáticamente el rol Premium y se actualizan sus Claims.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Link href="/panel" className="w-full">
              <Button className="w-full bg-vet-primary hover:bg-vet-primary/90">
                Ir al Panel Principal (/panel)
              </Button>
            </Link>
            <Link href="/admin/payments" className="w-full">
              <Button color="light" className="w-full">
                Ver Comprobantes
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
            <HiBookOpen className="text-vet-primary" />
            Vademécum Global de Fármacos
          </h2>
          <p className="text-sm text-gray-600">
            Supervisa los 100 medicamentos base disponibles para todos los veterinarios.
          </p>
          <div className="pt-2">
            <Link href="/treatments/new">
              <Button color="light" className="w-full">
                Consultar Vademécum en vivo
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
