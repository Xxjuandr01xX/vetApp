'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, Button, Spinner, Badge, Progress } from 'flowbite-react';
import {
  HiDownload,
  HiRefresh,
  HiOutlineTrendingUp,
  HiOutlineUserGroup,
  HiOutlineCalendar,
  HiOutlineCurrencyDollar,
  HiPrinter,
} from 'react-icons/hi';
import { useAuth } from '@/lib/hooks/useAuth';
import { getPets } from '@/lib/services/pets';
import { getAppointments } from '@/lib/services/appointments';
import { getTreatments } from '@/lib/services/treatments';
import { calculateReportsSummary, ReportsSummary } from '@/lib/services/reports';
import {
  exportPetsToCsv,
  exportAppointmentsToCsv,
  exportTreatmentsToCsv,
  triggerFileDownload,
} from '@/lib/utils/export-csv';
import { formatVES } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [rawPets, setRawPets] = useState<any[]>([]);
  const [rawAppointments, setRawAppointments] = useState<any[]>([]);
  const [rawTreatments, setRawTreatments] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [pets, appointments, treatments] = await Promise.all([
        getPets(user.uid),
        getAppointments(user.uid),
        getTreatments(user.uid),
      ]);

      setRawPets(pets);
      setRawAppointments(appointments);
      setRawTreatments(treatments);

      const calculated = calculateReportsSummary(pets, appointments, treatments);
      setSummary(calculated);
    } catch (err) {
      console.error('Error cargando datos para reportes:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportAll = () => {
    const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
    if (rawPets.length > 0) {
      triggerFileDownload(exportPetsToCsv(rawPets), `Pacientes_${dateStr}.csv`);
    }
    if (rawAppointments.length > 0) {
      setTimeout(() => {
        triggerFileDownload(exportAppointmentsToCsv(rawAppointments), `Citas_${dateStr}.csv`);
      }, 300);
    }
    if (rawTreatments.length > 0) {
      setTimeout(() => {
        triggerFileDownload(exportTreatmentsToCsv(rawTreatments), `Tratamientos_${dateStr}.csv`);
      }, 600);
    }
  };

  return (
    <div className="pb-24 sm:pb-8 max-w-6xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Reportes Clínicos y Métricas
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Estadísticas de pacientes, tasas de asistencia, tratamientos y facturación
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" color="light" onClick={loadData} disabled={loading}>
            <HiRefresh className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </Button>
          <Button
            size="sm"
            color="light"
            onClick={() => window.print()}
            title="Imprimir resumen de reportes"
          >
            <HiPrinter className="mr-1.5 h-4 w-4" /> Imprimir
          </Button>
          <Button
            size="sm"
            className="bg-vet-primary hover:bg-vet-primary/90"
            onClick={handleExportAll}
            disabled={loading}
          >
            <HiDownload className="mr-1.5 h-4 w-4" /> Exportar Todo (CSV)
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Spinner size="xl" color="info" />
          <p className="mt-3 text-sm text-gray-500">Calculando métricas y reportes...</p>
        </div>
      ) : !summary ? (
        <Card className="text-center py-12">
          <p className="text-gray-500">No hay datos suficientes para generar reportes.</p>
        </Card>
      ) : (
        <>
          {/* Tarjetas Principales de KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-1">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-vet-primary rounded-xl">
                  <HiOutlineUserGroup className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase font-semibold">Total Pacientes</span>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalPets}</p>
                  <span className="text-xs text-emerald-600 font-medium">
                    {summary.activePets} activos
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-1">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
                  <HiOutlineCalendar className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase font-semibold">Total Citas</span>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalAppointments}</p>
                  <span className="text-xs text-blue-600 font-medium">
                    {summary.completionRate}% asistencia
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-1">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                  <HiOutlineTrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase font-semibold">Tratamientos</span>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalTreatments}</p>
                  <span className="text-xs text-gray-500">Prescripciones emitidas</span>
                </div>
              </div>
            </Card>

            <Card className="p-1">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                  <HiOutlineCurrencyDollar className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase font-semibold">Facturación Honorarios</span>
                  <p className="text-xl font-bold text-emerald-600">
                    ${summary.totalIncomeUSD.toFixed(2)} USD
                  </p>
                  <span className="text-2xl text-emerald-700 font-bold block">
                    {formatVES(summary.totalIncomeVES)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Grillas de Análisis Detallado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribución por Especies */}
            <Card>
              <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3">
                🐾 Distribución de Pacientes por Especie
              </h3>
              {summary.speciesDistribution.length === 0 ? (
                <p className="text-sm text-gray-400">Sin datos de especies.</p>
              ) : (
                <div className="space-y-3">
                  {summary.speciesDistribution.map((sp) => (
                    <div key={sp.species}>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="text-gray-700">{sp.species}</span>
                        <span className="text-gray-500">
                          {sp.count} paciente(s) ({sp.percentage}%)
                        </span>
                      </div>
                      <Progress progress={sp.percentage} color="blue" size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Rendimiento de Agenda y Citas */}
            <Card>
              <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3">
                📅 Rendimiento de Agenda y Consultas
              </h3>
              <div className="grid grid-cols-2 gap-3 text-center mb-4">
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <span className="text-xs text-emerald-800 block">Completadas</span>
                  <span className="text-xl font-bold text-emerald-700">
                    {summary.completedAppointments}
                  </span>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <span className="text-xs text-blue-800 block">Programadas</span>
                  <span className="text-xl font-bold text-blue-700">
                    {summary.scheduledAppointments}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <span className="text-xs text-amber-800 block">No asistieron</span>
                  <span className="text-xl font-bold text-amber-700">
                    {summary.noShowAppointments}
                  </span>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <span className="text-xs text-red-800 block">Canceladas</span>
                  <span className="text-xl font-bold text-red-700">
                    {summary.cancelledAppointments}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-gray-700">Tasa de Concreción de Consultas</span>
                  <span className="font-bold text-emerald-600">{summary.completionRate}%</span>
                </div>
                <Progress progress={summary.completionRate} color="green" size="sm" />
              </div>
            </Card>

            {/* Top Diagnósticos Frecuentes */}
            <Card>
              <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3">
                🩺 Diagnósticos Más Frecuentes
              </h3>
              {summary.topDiagnoses.length === 0 ? (
                <p className="text-sm text-gray-400">Sin tratamientos registrados.</p>
              ) : (
                <div className="space-y-2">
                  {summary.topDiagnoses.map((diag, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-vet-primary">#{index + 1}</span>
                        <span className="font-medium text-gray-800">{diag.diagnosis}</span>
                      </div>
                      <Badge color="info">{diag.count} caso(s)</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top Medicamentos Prescritos */}
            <Card>
              <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3">
                💊 Medicamentos Más Recetados
              </h3>
              {summary.topMedications.length === 0 ? (
                <p className="text-sm text-gray-400">Sin prescripciones registradas.</p>
              ) : (
                <div className="space-y-2">
                  {summary.topMedications.map((med, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600">#{index + 1}</span>
                        <span className="font-medium text-gray-800">{med.name}</span>
                      </div>
                      <Badge color="success">{med.count} receta(s)</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
