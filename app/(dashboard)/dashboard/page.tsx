'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button } from 'flowbite-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBcvRates } from '@/lib/hooks/useBcvRates';
import { getPetsCount } from '@/lib/services/pets';
import { getTodayAppointmentsCount } from '@/lib/services/appointments';
import { getTreatmentsCount } from '@/lib/services/treatments';
import { formatVES } from '@/lib/utils/currency';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { rates, isLoading: loadingBcv } = useBcvRates();
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [todayAppCount, setTodayAppCount] = useState<number | null>(null);
  const [treatmentCount, setTreatmentCount] = useState<number | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      try {
        const [pCount, aCount, tCount] = await Promise.all([
          getPetsCount(user.uid),
          getTodayAppointmentsCount(user.uid),
          getTreatmentsCount(user.uid),
        ]);
        setPatientCount(pCount);
        setTodayAppCount(aCount);
        setTreatmentCount(tCount);
      } catch (err) {
        console.error('Error cargando estadísticas del dashboard:', err);
      }
    }
    loadStats();
  }, [user]);

  return (
    <div className="pb-24 sm:pb-8">
      {/* Saludo */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Hola, {profile?.displayName?.split(' ')[0] || 'Doctor'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Bienvenido a tu consultorio digital</p>
        <div className="mt-2">
          <Badge color={profile?.role === 'premium' ? 'success' : profile?.role === 'admin' ? 'purple' : 'gray'}>
            {profile?.role === 'premium' ? '⭐ Premium' : profile?.role === 'admin' ? '👑 Admin' : 'Plan Gratuito'}
          </Badge>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link href="/pets">
          <StatCard
            icon="🐾"
            label="Pacientes"
            value={patientCount !== null ? patientCount.toString() : '...'}
            color="bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          />
        </Link>
        <Link href="/appointments">
          <StatCard
            icon="📅"
            label="Citas hoy"
            value={todayAppCount !== null ? todayAppCount.toString() : '...'}
            color="bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
          />
        </Link>
        <Link href="/treatments">
          <StatCard
            icon="💊"
            label="Tratamientos"
            value={treatmentCount !== null ? treatmentCount.toString() : '...'}
            color="bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
          />
        </Link>
        <StatCard
          icon="💰"
          label={rates?.stale ? 'Tasa BCV (Ayer)' : 'Tasa BCV Oficial'}
          value={loadingBcv ? '...' : rates?.usd ? formatVES(rates.usd) : 'No disp.'}
          color="bg-purple-50 text-purple-700"
        />
      </div>

      {/* Acciones rápidas */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link href="/pets/new">
            <Button color="light" className="w-full justify-start">
              <span className="mr-2">🐾</span> Nuevo paciente
            </Button>
          </Link>
          <Link href="/pets">
            <Button color="light" className="w-full justify-start">
              <span className="mr-2">📋</span> Ver pacientes
            </Button>
          </Link>
          <Link href="/appointments">
            <Button color="light" className="w-full justify-start">
              <span className="mr-2">📅</span> Agendar cita
            </Button>
          </Link>
          <Link href="/treatments/new">
            <Button color="light" className="w-full justify-start">
              <span className="mr-2">💊</span> Nuevo tratamiento
            </Button>
          </Link>
          <Link href="/medications">
            <Button color="light" className="w-full justify-start">
              <span className="mr-2">⚖️</span> Vademécum y Dosis
            </Button>
          </Link>
          <Link href="/reports">
            <Button color="light" className="w-full justify-start">
              <span className="mr-2">📊</span> Reportes y CSV
            </Button>
          </Link>
        </div>
      </Card>

      {/* Estado condicional según si tiene pacientes o no */}
      {patientCount === 0 && (
        <Card>
          <div className="text-center py-8">
            <span className="text-5xl mb-4 block">🏥</span>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">¡Tu consultorio está listo!</h3>
            <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
              Comienza registrando a tu primer paciente para empezar a gestionar sus historias clínicas y consultas.
            </p>
            <Link href="/pets/new">
              <Button className="bg-vet-accent hover:bg-vet-accent/90">
                Registrar primer paciente
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl p-4 cursor-pointer ${color}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-75">{label}</div>
    </div>
  );
}
