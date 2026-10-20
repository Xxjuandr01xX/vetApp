'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Tabs, Badge, Button, Spinner, Alert } from 'flowbite-react';
import {
  HiArrowLeft,
  HiPencil,
  HiTrash,
  HiPhone,
  HiMail,
  HiLocationMarker,
  HiExclamationCircle,
  HiPlus,
  HiDocumentText,
} from 'react-icons/hi';
import { getPetById, deletePet } from '@/lib/services/pets';
import { getAppointmentsByPet } from '@/lib/services/appointments';
import { getTreatmentsByPet } from '@/lib/services/treatments';
import { getPetHistory } from '@/lib/services/history';
import { Pet } from '@/lib/types/pet';
import { Appointment } from '@/lib/types/appointment';
import { Treatment, HistoryEvent } from '@/lib/types/treatment';
import { SpeciesIcon, SpeciesBadge } from '@/components/domain/SpeciesIcon';
import { AppointmentStatusBadge } from '@/components/domain/AppointmentStatusBadge';
import { DeletePetModal } from '@/components/domain/DeletePetModal';
import { ShareTreatmentModal } from '@/components/domain/ShareTreatmentModal';
import { ShareAppointmentModal } from '@/components/domain/ShareAppointmentModal';
import { differenceInMonths, differenceInYears, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatVES } from '@/lib/utils/currency';

export default function PetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const petId = params.id as string;
  const autoShareId = searchParams.get('shareTreatmentId');

  const [pet, setPet] = useState<Pet | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [selectedShareTreatment, setSelectedShareTreatment] = useState<Treatment | null>(null);
  const [selectedShareAppointment, setSelectedShareAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPet() {
      if (!petId) return;
      try {
        const petData = await getPetById(petId);
        if (petData) {
          setPet(petData);
          // Cargar datos complementarios de forma aislada
          getAppointmentsByPet(petId)
            .then((apps) => setAppointments(apps))
            .catch((err) => console.error('Error cargando citas asociadas:', err));

          getTreatmentsByPet(petId)
            .then((trts) => {
              setTreatments(trts);
              if (autoShareId) {
                const found = trts.find((t) => t.id === autoShareId);
                if (found) setSelectedShareTreatment(found);
              }
            })
            .catch((err) => console.error('Error cargando tratamientos asociados:', err));

          getPetHistory(petId)
            .then((evts) => setHistoryEvents(evts))
            .catch((err) => console.error('Error cargando historial clínico:', err));
        } else {
          setError('El paciente no fue encontrado.');
        }
      } catch (err: any) {
        console.error('Error cargando paciente:', err);
        setError(err?.message || 'Error al cargar la información del paciente.');
      } finally {
        setLoading(false);
      }
    }
    loadPet();
  }, [petId, autoShareId]);

  const handleDeleteConfirm = async () => {
    if (!petId) return;
    const res = await deletePet(petId);
    if (res.success) {
      router.push('/pets');
    } else {
      throw new Error(res.error || 'No se pudo eliminar el paciente');
    }
  };

  // Cálculo legible de la edad
  const calculateAge = (birthDate: any) => {
    if (!birthDate) return 'No registrada';
    const date = birthDate?.toDate ? birthDate.toDate() : new Date(birthDate);
    const years = differenceInYears(new Date(), date);
    if (years >= 1) {
      const remainingMonths = differenceInMonths(new Date(), date) % 12;
      return `${years} año${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` y ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}` : ''}`;
    }
    const months = differenceInMonths(new Date(), date);
    return months > 0 ? `${months} mes${months > 1 ? 'es' : ''}` : 'Menos de 1 mes';
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <Spinner size="xl" color="info" />
        <p className="mt-3 text-sm text-gray-500">Cargando ficha del paciente...</p>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Alert color="failure" icon={HiExclamationCircle} className="mb-4">
          {error || 'Paciente no encontrado'}
        </Alert>
        <Link href="/pets">
          <Button color="gray">
            <HiArrowLeft className="mr-2 h-4 w-4" /> Volver a la lista
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24 sm:pb-8 max-w-5xl mx-auto">
      {/* Navegación y Acciones Superiores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Link
          href="/pets"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <HiArrowLeft className="mr-1.5 h-4 w-4" /> Volver a pacientes
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/pets/${pet.id}/edit`}>
            <Button size="sm" color="light">
              <HiPencil className="mr-1.5 h-4 w-4" /> Editar
            </Button>
          </Link>
          <Button
            size="sm"
            color="failure"
            onClick={() => setShowDeleteModal(true)}
          >
            <HiTrash className="mr-1.5 h-4 w-4" /> Eliminar
          </Button>
        </div>
      </div>

      {/* Ficha Principal Header */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <SpeciesIcon species={pet.species} size="xl" />

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{pet.name}</h1>
              <SpeciesBadge species={pet.species} />
              <Badge color={pet.status === 'active' ? 'success' : pet.status === 'inactive' ? 'gray' : 'failure'}>
                {pet.status === 'active' ? 'Activo' : pet.status === 'inactive' ? 'Inactivo' : 'Fallecido'}
              </Badge>
            </div>

            <p className="text-gray-600 text-sm mb-3">
              {pet.breed || 'Sin raza especificada'} • {pet.sex === 'M' ? 'Macho' : 'Hembra'} •{' '}
              {pet.neutered ? 'Esterilizado' : 'Entero'}
            </p>

            {/* Fila de métricas rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-subtle p-3 rounded-lg text-sm">
              <div>
                <span className="text-xs text-gray-400 block">Edad</span>
                <span className="font-semibold text-gray-800">{calculateAge(pet.birthDate)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Peso</span>
                <span className="font-semibold text-gray-800">
                  {pet.weightKg ? `${pet.weightKg} kg` : 'Sin registrar'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Color</span>
                <span className="font-semibold text-gray-800">{pet.color || 'No especificado'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Microchip</span>
                <span className="font-semibold text-gray-800">{pet.microchip || 'Ninguno'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas médicas (Alergias y Condiciones crónicas) */}
        {((pet.allergies && pet.allergies.length > 0) ||
          (pet.chronicConditions && pet.chronicConditions.length > 0)) && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
            {pet.allergies?.map((all, i) => (
              <span
                key={i}
                className="bg-red-50 text-red-700 border border-red-200 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"
              >
                ⚠️ Alergia: {all}
              </span>
            ))}
            {pet.chronicConditions?.map((cond, i) => (
              <span
                key={i}
                className="bg-amber-50 text-amber-800 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"
              >
                🩺 Crónico: {cond}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Tabs de Información Detallada */}
      <Tabs aria-label="Ficha clínica del paciente" variant="underline">
        {/* Tab 1: Datos y Tutor */}
        <Tabs.Item active title="Datos Generales">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Tarjeta del Propietario */}
            <Card>
              <h3 className="font-bold text-gray-800 text-base mb-3 border-b pb-2">
                👤 Tutor / Propietario
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400 text-xs block">Nombre</span>
                  <span className="font-medium text-gray-900">{pet.owner.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <HiPhone className="text-vet-primary h-4 w-4" />
                  <a
                    href={`tel:${pet.owner.phone}`}
                    className="text-vet-primary-light hover:underline font-medium"
                  >
                    {pet.owner.phone}
                  </a>
                </div>

                {pet.owner.email && (
                  <div className="flex items-center gap-2">
                    <HiMail className="text-vet-primary h-4 w-4" />
                    <a
                      href={`mailto:${pet.owner.email}`}
                      className="text-vet-primary-light hover:underline"
                    >
                      {pet.owner.email}
                    </a>
                  </div>
                )}

                {pet.owner.address && (
                  <div className="flex items-start gap-2">
                    <HiLocationMarker className="text-vet-primary h-4 w-4 mt-0.5" />
                    <span className="text-gray-600">{pet.owner.address}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Notas Clínicas */}
            <Card>
              <h3 className="font-bold text-gray-800 text-base mb-3 border-b pb-2">
                📝 Notas y Observaciones
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                {pet.notes || 'No hay notas registradas para este paciente.'}
              </p>
            </Card>
          </div>
        </Tabs.Item>

        {/* Tab 2: Tratamientos */}
        <Tabs.Item title={`Tratamientos (${treatments.length})`}>
          <div className="pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 text-base">Tratamientos del Paciente</h3>
              <Link href={`/treatments/new?petId=${pet.id}`}>
                <Button size="xs" className="bg-vet-primary hover:bg-vet-primary/90">
                  <HiPlus className="mr-1 h-3.5 w-3.5" /> Nuevo Tratamiento
                </Button>
              </Link>
            </div>

            {treatments.length === 0 ? (
              <div className="py-8 text-center bg-white rounded-xl border border-gray-100 p-6">
                <span className="text-4xl block mb-2">💊</span>
                <h4 className="font-semibold text-gray-800 mb-1">Sin tratamientos activos</h4>
                <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                  Prescribe medicamentos, dosificaciones y procedimientos para {pet.name}.
                </p>
                <Link href={`/treatments/new?petId=${pet.id}`}>
                  <Button size="sm" className="bg-vet-primary hover:bg-vet-primary/90">
                    <HiPlus className="mr-1.5 h-4 w-4" /> Crear primer tratamiento
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {treatments.map((trt) => {
                  const d = trt.createdAt instanceof Date
                    ? trt.createdAt
                    : (trt.createdAt as any)?.toDate
                    ? (trt.createdAt as any).toDate()
                    : new Date(trt.createdAt as any);

                  return (
                    <Card key={trt.id} className="p-1">
                      <div className="flex items-start justify-between gap-3 border-b pb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900 text-base">
                              {trt.diagnosis}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">
                            Registrado el {format(d, "d 'de' MMMM, yyyy", { locale: es })}
                            {trt.weightAtVisit && ` • Peso: ${trt.weightAtVisit} kg`}
                          </p>
                        </div>
                        <Button
                          size="xs"
                          color="light"
                          className="border-green-200 text-green-700 hover:bg-green-50 shadow-sm"
                          onClick={() => setSelectedShareTreatment(trt)}
                        >
                          <span className="mr-1">📲</span> Récipe / WhatsApp
                        </Button>
                      </div>

                      {/* Medicamentos recetados */}
                      {trt.medications && trt.medications.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Medicamentos Indicados ({trt.medications.length})
                          </h5>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {trt.medications.map((med, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-lg border border-gray-100 bg-white text-xs space-y-0.5"
                              >
                                <p className="font-bold text-vet-primary">
                                  {med.commercialName || med.activeIngredient}
                                </p>
                                <p className="text-gray-500 text-[11px]">
                                  {med.activeIngredient} • Vía {med.route || 'Oral'}
                                </p>
                                <p className="text-gray-700 font-medium">
                                  Dosis: {med.dose} • {med.frequency} por {med.durationDays} días
                                </p>
                                {med.notes && (
                                  <p className="text-gray-500 italic mt-0.5">
                                    Nota: {med.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Procedimientos */}
                      {trt.procedures && trt.procedures.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            Procedimientos
                          </h5>
                          <div className="flex flex-wrap gap-1.5">
                            {trt.procedures.map((proc, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium"
                              >
                                {proc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Honorarios y costo del tratamiento */}
                      {trt.servicePrice && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2.5 text-xs gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-emerald-800 font-bold">💰 Honorarios:</span>
                            <span className="font-bold text-gray-900">${trt.servicePrice.amountUSD.toFixed(2)} USD</span>
                            <span className="text-emerald-700 font-bold">({formatVES(trt.servicePrice.amountVES)})</span>
                          </div>
                          <span className="text-[11px] text-gray-500">
                            Tasa {trt.servicePrice.rateSource}: <strong>{formatVES(trt.servicePrice.rateUsed)}</strong>
                          </span>
                        </div>
                      )}

                      {trt.recommendations && (
                        <p className="text-xs text-gray-600 border-t pt-2">
                          <span className="font-medium text-gray-700">Recomendaciones: </span>
                          {trt.recommendations}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </Tabs.Item>

        {/* Tab 3: Citas y Consultas */}
        <Tabs.Item title={`Citas (${appointments.length})`}>
          <div className="pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 text-base">Citas del Paciente</h3>
              <Link href={`/appointments/new?petId=${pet.id}`}>
                <Button size="xs" className="bg-vet-primary hover:bg-vet-primary/90">
                  <HiPlus className="mr-1 h-3.5 w-3.5" /> Agendar Cita
                </Button>
              </Link>
            </div>

            {appointments.length === 0 ? (
              <div className="py-8 text-center bg-white rounded-xl border border-gray-100 p-6">
                <span className="text-4xl block mb-2">📅</span>
                <h4 className="font-semibold text-gray-800 mb-1">No hay citas registradas</h4>
                <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                  Agenda consultas o controles médicos para {pet.name}.
                </p>
                <Link href={`/appointments/new?petId=${pet.id}`}>
                  <Button size="sm" className="bg-vet-primary hover:bg-vet-primary/90">
                    <HiPlus className="mr-1.5 h-4 w-4" /> Agendar primera cita
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((app) => {
                  const d = app.date instanceof Date ? app.date : (app.date as any)?.toDate ? (app.date as any).toDate() : new Date(app.date as any);
                  return (
                    <div
                      key={app.id}
                      className="p-3 bg-white rounded-lg border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">
                            {format(d, "d 'de' MMMM, yyyy - hh:mm a", { locale: es })}
                          </span>
                          <AppointmentStatusBadge status={app.status} />
                          {app.servicePrice && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              Honorarios: ${app.servicePrice.amountUSD.toFixed(2)} USD ({formatVES(app.servicePrice.amountVES)})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 font-medium">{app.reason}</p>
                        {app.notes && (
                          <p className="text-xs text-gray-400 mt-0.5 italic">
                            Nota: {app.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                          {app.durationMin} min
                        </span>
                        <Button
                          size="xs"
                          color="light"
                          className="flex items-center gap-1"
                          onClick={() => setSelectedShareAppointment(app)}
                          title="Descargar comprobante o enviar por WhatsApp"
                        >
                          <HiDocumentText className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Tabs.Item>

        {/* Tab 4: Historial Cronológico Inmutable */}
        <Tabs.Item title={`Historial Clínico (${historyEvents.length})`}>
          <div className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-base">Cronología de Eventos Clínicos</h3>
              <Link href={`/history/${pet.id}`}>
                <Button size="xs" color="light">
                  Ver expediente completo e imprimir
                </Button>
              </Link>
            </div>

            {historyEvents.length === 0 ? (
              <div className="py-8 text-center bg-white rounded-xl border border-gray-100 p-6">
                <span className="text-4xl block mb-2">📋</span>
                <h4 className="font-semibold text-gray-800 mb-1">Expediente iniciado</h4>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Cada consulta, tratamiento y actualización de peso generará automáticamente un registro inmutable en esta línea de tiempo.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-gray-200 space-y-6">
                {historyEvents.map((evt) => {
                  const d = evt.date instanceof Date
                    ? evt.date
                    : (evt.date as any)?.toDate
                    ? (evt.date as any).toDate()
                    : new Date(evt.date as any);

                  const getBadge = (type: string) => {
                    switch (type) {
                      case 'treatment':
                        return <Badge color="info">💊 Tratamiento</Badge>;
                      case 'weight':
                        return <Badge color="success">⚖️ Peso</Badge>;
                      case 'appointment':
                        return <Badge color="purple">📅 Cita</Badge>;
                      case 'vaccination':
                      case 'vaccine':
                        return <Badge color="warning">💉 Vacuna</Badge>;
                      default:
                        return <Badge color="gray">📋 Registro</Badge>;
                    }
                  };

                  return (
                    <div key={evt.id} className="relative">
                      {/* Punto en la línea de tiempo */}
                      <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-vet-primary border-2 border-white ring-2 ring-vet-primary/20" />

                      <div className="bg-white p-3.5 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            {getBadge(evt.type)}
                            <span className="font-bold text-sm text-gray-900">{evt.summary}</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {format(d, "d 'de' MMMM, yyyy - hh:mm a", { locale: es })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Tabs.Item>
      </Tabs>

      {/* Modal destructivo de confirmación */}
      <DeletePetModal
        show={showDeleteModal}
        petName={pet.name}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Modal para descargar PDF y compartir por WhatsApp (Tratamiento) */}
      <ShareTreatmentModal
        show={!!selectedShareTreatment}
        onClose={() => setSelectedShareTreatment(null)}
        treatment={selectedShareTreatment}
        pet={pet}
      />

      {/* Modal para descargar comprobante PDF y compartir por WhatsApp (Cita) */}
      <ShareAppointmentModal
        show={!!selectedShareAppointment}
        onClose={() => setSelectedShareAppointment(null)}
        appointment={selectedShareAppointment}
        pet={pet}
      />
    </div>
  );
}
