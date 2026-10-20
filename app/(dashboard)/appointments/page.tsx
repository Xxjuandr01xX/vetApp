'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Button, Card, Spinner, Select, TextInput } from 'flowbite-react';
import {
  HiPlus,
  HiCalendar,
  HiClock,
  HiPhone,
  HiCheck,
  HiX,
  HiChevronLeft,
  HiChevronRight,
  HiTrash,
  HiDocumentText,
  HiDownload,
} from 'react-icons/hi';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getAppointments,
  updateAppointmentStatus,
  deleteAppointment,
} from '@/lib/services/appointments';
import { getPetById } from '@/lib/services/pets';
import { Appointment, AppointmentStatus } from '@/lib/types/appointment';
import { AppointmentStatusBadge } from '@/components/domain/AppointmentStatusBadge';
import { SpeciesIcon } from '@/components/domain/SpeciesIcon';
import { Pet, Species } from '@/lib/types/pet';
import { ShareAppointmentModal } from '@/components/domain/ShareAppointmentModal';
import { formatVES } from '@/lib/utils/currency';
import { exportAppointmentsToCsv, triggerFileDownload } from '@/lib/utils/export-csv';
import {
  format,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShareAppointment, setSelectedShareAppointment] = useState<Appointment | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  // Cargar citas según rango
  const loadAppointments = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (viewMode === 'day') {
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
      } else if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
      }

      const data = await getAppointments(user.uid, {
        startDate,
        endDate,
      });
      setAppointments(data);
    } catch (err) {
      console.error('Error cargando citas:', err);
    } finally {
      setLoading(false);
    }
  }, [user, currentDate, viewMode]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const resetAllFilters = () => {
    setViewMode('all');
    setStatusFilter('all');
    setCurrentDate(new Date());
  };

  const isFilterActive = statusFilter !== 'all' || viewMode !== 'all';

  const handleStatusChange = async (appId: string, newStatus: AppointmentStatus) => {
    await updateAppointmentStatus(appId, newStatus, user?.uid);
    setAppointments((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
    );
  };

  const handleDelete = async (appId: string) => {
    if (confirm('¿Deseas eliminar esta cita de la agenda?')) {
      await deleteAppointment(appId, user?.uid);
      setAppointments((prev) => prev.filter((a) => a.id !== appId));
    }
  };

  const handleOpenShareModal = async (app: Appointment) => {
    setSelectedShareAppointment(app);
    if (app.petId) {
      try {
        const petData = await getPetById(app.petId);
        if (petData) {
          setSelectedPet(petData);
          return;
        }
      } catch (e) {
        console.error('Error cargando paciente para cita:', e);
      }
    }
    // Fallback con datos contenidos en la cita
    setSelectedPet({
      id: app.petId || 'unknown',
      vetId: app.vetId,
      name: app.petName || 'Paciente',
      species: (app.petSpecies as Species) || 'Canino',
      sex: 'M',
      neutered: false,
      owner: {
        name: app.ownerName || 'Tutor',
        phone: app.ownerPhone || '',
      },
      allergies: [],
      chronicConditions: [],
      status: 'active',
      createdAt: null as any,
      updatedAt: null as any,
    });
  };

  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'all') return appointments;
    return appointments.filter((a) => a.status === statusFilter);
  }, [appointments, statusFilter]);

  const formatAppDate = (dateVal: any) => {
    if (!dateVal) return '';
    const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
    return format(d, 'hh:mm a', { locale: es });
  };

  const formatAppFullDate = (dateVal: any) => {
    if (!dateVal) return '';
    const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
    return format(d, "EEEE, d 'de' MMMM", { locale: es });
  };

  const handleExportCsv = () => {
    if (appointments.length === 0) return;
    const csvContent = exportAppointmentsToCsv(
      filteredAppointments.length > 0 ? filteredAppointments : appointments
    );
    const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
    triggerFileDownload(csvContent, `Citas_VetSaaS_${dateStr}.csv`);
  };

  return (
    <div className="pb-24 sm:pb-8 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Agenda de Citas</h1>
          <p className="text-sm text-gray-500">Planificación de consultas y controles</p>
        </div>

        <div className="flex items-center gap-2">
          {appointments.length > 0 && (
            <Button
              size="sm"
              color="light"
              onClick={handleExportCsv}
              title="Exportar citas actuales a CSV / Excel"
              className="flex items-center"
            >
              <HiDownload className="mr-1.5 h-4 w-4 text-emerald-600" /> Exportar CSV
            </Button>
          )}

          {isFilterActive && (
            <Button size="sm" color="gray" onClick={resetAllFilters}>
              🔄 Limpiar filtros
            </Button>
          )}

          <Link href="/appointments/new">
            <Button className="w-full sm:w-auto bg-vet-primary hover:bg-vet-primary/90">
              <HiPlus className="mr-2 h-4 w-4" /> Agendar Cita
            </Button>
          </Link>
        </div>
      </div>

      {/* Controles de Navegación de Fecha */}
      <Card className="mb-6 p-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Navegador por días/semanas */}
          <div className="flex items-center gap-2">
            {viewMode !== 'all' && (
              <>
                <Button
                  color="light"
                  size="sm"
                  onClick={() =>
                    setCurrentDate((prev) => (viewMode === 'day' ? subDays(prev, 1) : subDays(prev, 7)))
                  }
                >
                  <HiChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  color="light"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  disabled={isToday(currentDate) && viewMode === 'day'}
                >
                  Hoy
                </Button>

                <Button
                  color="light"
                  size="sm"
                  onClick={() =>
                    setCurrentDate((prev) => (viewMode === 'day' ? addDays(prev, 1) : addDays(prev, 7)))
                  }
                >
                  <HiChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            <span className="text-base font-semibold text-gray-800 capitalize ml-2">
              {viewMode === 'all'
                ? '📋 Todas las citas registradas'
                : viewMode === 'day'
                ? format(currentDate, "EEEE d 'de' MMMM, yyyy", { locale: es })
                : `Semana del ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM')} al ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM, yyyy')}`}
            </span>
          </div>

          {/* Filtros de Modo y Estado */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs">
              <button
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  viewMode === 'all' ? 'bg-white shadow-sm text-vet-primary font-bold' : 'text-gray-500'
                }`}
                onClick={() => setViewMode('all')}
              >
                Todas
              </button>
              <button
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  viewMode === 'day' ? 'bg-white shadow-sm text-vet-primary font-bold' : 'text-gray-500'
                }`}
                onClick={() => setViewMode('day')}
              >
                Día
              </button>
              <button
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  viewMode === 'week' ? 'bg-white shadow-sm text-vet-primary font-bold' : 'text-gray-500'
                }`}
                onClick={() => setViewMode('week')}
              >
                Semana
              </button>
            </div>

            <Select
              sizing="sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="scheduled">Programadas</option>
              <option value="completed">Completadas</option>
              <option value="cancelled">Canceladas</option>
              <option value="no_show">No asistieron</option>
            </Select>

            {isFilterActive && (
              <Button size="xs" color="light" onClick={resetAllFilters}>
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Listado de Citas */}
      {loading ? (
        <div className="text-center py-16">
          <Spinner size="xl" color="info" />
          <p className="mt-3 text-sm text-gray-500">Cargando agenda...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-4xl mb-3">📅</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {appointments.length > 0
              ? 'No hay citas con este filtro'
              : 'No hay citas programadas'}
          </h3>
          <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
            {appointments.length > 0
              ? 'Tienes citas registradas en esta fecha, pero ninguna coincide con el filtro seleccionado. Cambia el filtro a "Todos los estados" para verlas.'
              : viewMode === 'day'
              ? 'No tienes citas agendadas para este día.'
              : 'No hay citas registradas para esta semana.'}
          </p>
          {appointments.length > 0 ? (
            <Button
              color="light"
              className="inline-block mx-auto"
              onClick={() => setStatusFilter('all')}
            >
              Mostrar todas las citas
            </Button>
          ) : (
            <Link href="/appointments/new" className="inline-block mx-auto">
              <Button className="bg-vet-primary hover:bg-vet-primary/90">
                <HiPlus className="mr-1.5 h-4 w-4" /> Agendar cita ahora
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((app) => (
            <div
              key={app.id}
              className={`card-vet p-4 transition-all border-l-4 ${
                app.status === 'completed'
                  ? 'border-l-emerald-500 bg-emerald-50/20'
                  : app.status === 'cancelled'
                  ? 'border-l-red-400 bg-red-50/20 opacity-75'
                  : app.status === 'no_show'
                  ? 'border-l-amber-400 bg-amber-50/20'
                  : 'border-l-blue-500'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Info Cita & Paciente */}
                <div className="flex items-start gap-3">
                  <SpeciesIcon
                    species={(app.petSpecies as Species) || 'Otro'}
                    size="md"
                  />

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/pets/${app.petId}`}
                        className="font-bold text-gray-900 hover:text-vet-primary-light text-base"
                      >
                        {app.petName || 'Paciente'}
                      </Link>
                      <AppointmentStatusBadge status={app.status} />
                    </div>

                    <p className="text-sm font-medium text-gray-700 mt-0.5">
                      {app.reason}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1 font-semibold text-gray-700">
                        <HiClock className="text-vet-primary h-3.5 w-3.5" />
                        {formatAppDate(app.date)} ({app.durationMin} min)
                      </span>

                      {viewMode === 'week' && (
                        <span className="flex items-center gap-1 capitalize">
                          <HiCalendar className="text-gray-400 h-3.5 w-3.5" />
                          {formatAppFullDate(app.date)}
                        </span>
                      )}

                      {app.ownerName && <span>Dueño: {app.ownerName}</span>}

                      {app.ownerPhone && (
                        <a
                          href={`tel:${app.ownerPhone}`}
                          className="flex items-center gap-1 text-vet-primary-light hover:underline font-medium"
                        >
                          <HiPhone className="h-3 w-3" />
                          {app.ownerPhone}
                        </a>
                      )}
                    </div>

                    {app.servicePrice && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 w-fit">
                        <span className="font-semibold">Honorarios:</span>
                        <span>${app.servicePrice.amountUSD.toFixed(2)} USD</span>
                        <span className="text-emerald-600 font-medium">({formatVES(app.servicePrice.amountVES)})</span>
                      </div>
                    )}

                    {app.notes && (
                      <p className="text-xs text-gray-400 mt-1.5 italic bg-white/70 p-1.5 rounded border border-gray-100">
                        Nota: {app.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones Rápidas */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <Button
                    size="xs"
                    color="light"
                    onClick={() => handleOpenShareModal(app)}
                    title="Imprimir / Descargar Comprobante en PDF"
                    className="flex items-center"
                  >
                    <HiDocumentText className="h-4 w-4 text-blue-600 mr-1" />
                    PDF
                  </Button>

                  {app.status === 'scheduled' && (
                    <>
                      <Button
                        size="xs"
                        color="success"
                        onClick={() => handleStatusChange(app.id, 'completed')}
                        title="Marcar completada"
                      >
                        <HiCheck className="h-4 w-4" />
                      </Button>

                      <Button
                        size="xs"
                        color="warning"
                        onClick={() => handleStatusChange(app.id, 'no_show')}
                        title="No asistió"
                      >
                        No asistió
                      </Button>

                      <Button
                        size="xs"
                        color="failure"
                        onClick={() => handleStatusChange(app.id, 'cancelled')}
                        title="Cancelar"
                      >
                        <HiX className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {app.status !== 'scheduled' && (
                    <Button
                      size="xs"
                      color="light"
                      onClick={() => handleStatusChange(app.id, 'scheduled')}
                    >
                      Reabrir
                    </Button>
                  )}

                  <Button
                    size="xs"
                    color="gray"
                    onClick={() => handleDelete(app.id)}
                    title="Eliminar cita"
                  >
                    <HiTrash className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para descargar comprobante PDF y compartir cita */}
      <ShareAppointmentModal
        show={!!selectedShareAppointment}
        onClose={() => {
          setSelectedShareAppointment(null);
          setSelectedPet(null);
        }}
        appointment={selectedShareAppointment}
        pet={selectedPet}
      />
    </div>
  );
}
