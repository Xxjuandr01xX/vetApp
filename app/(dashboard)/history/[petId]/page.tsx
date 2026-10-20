'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Badge, Spinner, Alert, TextInput } from 'flowbite-react';
import {
  HiArrowLeft,
  HiSearch,
  HiPrinter,
  HiPlus,
  HiExclamationCircle,
  HiDownload,
} from 'react-icons/hi';
import { useAuth } from '@/lib/hooks/useAuth';
import { getPetById } from '@/lib/services/pets';
import { getPetHistory } from '@/lib/services/history';
import { Pet } from '@/lib/types/pet';
import { HistoryEvent } from '@/lib/types/treatment';
import { SpeciesIcon, SpeciesBadge } from '@/components/domain/SpeciesIcon';
import { generateClinicalHistoryPdfBlob } from '@/lib/utils/pdf-generator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PetHistoryPage() {
  const params = useParams();
  const petId = params.petId as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { user, profile } = useAuth();
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!petId) return;
      setLoading(true);
      setError('');

      try {
        const petData = await getPetById(petId);
        if (!petData) {
          setError('El paciente no fue encontrado.');
          return;
        }
        setPet(petData);

        const events = await getPetHistory(petId);
        setHistoryEvents(events);
      } catch (err: any) {
        console.error('Error cargando historial:', err);
        setError('Ocurrió un error al cargar el expediente clínico.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [petId]);

  const filteredEvents = useMemo(() => {
    return historyEvents.filter((evt) => {
      const matchesType = typeFilter === 'all' || evt.type === typeFilter;
      const normalizedQuery = searchTerm.toLowerCase().trim();
      const summaryMatch = (evt.summary || '').toLowerCase().includes(normalizedQuery);
      const detailsMatch = (evt as any).details
        ? JSON.stringify((evt as any).details).toLowerCase().includes(normalizedQuery)
        : false;

      return matchesType && (!normalizedQuery || summaryMatch || detailsMatch);
    });
  }, [historyEvents, typeFilter, searchTerm]);

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'treatment':
        return <Badge color="info">💊 Tratamiento</Badge>;
      case 'weight':
        return <Badge color="success">⚖️ Peso</Badge>;
      case 'appointment':
        return <Badge color="purple">📅 Cita</Badge>;
      case 'vaccination':
        return <Badge color="warning">💉 Vacuna</Badge>;
      default:
        return <Badge color="gray">📋 Registro</Badge>;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!pet) return;
    try {
      setDownloadingPdf(true);
      const vetName = profile?.displayName || user?.displayName || 'Médico Veterinario';
      const blob = await generateClinicalHistoryPdfBlob(pet, historyEvents, vetName);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = pet.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Historial_${safeName}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al generar PDF de historial:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner size="xl" />
        <p className="text-gray-500 text-sm">Cargando expediente cronológico...</p>
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
            <HiArrowLeft className="mr-2 h-4 w-4" /> Volver a pacientes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24 sm:pb-8 max-w-4xl mx-auto">
      {/* Navegación Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
        <Link
          href={`/pets/${pet.id}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          <HiArrowLeft className="mr-1.5 h-4 w-4" /> Volver a ficha de {pet.name}
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            color="light"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? (
              <>
                <Spinner size="xs" className="mr-1.5" /> Generando...
              </>
            ) : (
              <>
                <HiDownload className="mr-1.5 h-4 w-4 text-blue-600" /> Descargar PDF
              </>
            )}
          </Button>

          <Button size="sm" color="light" onClick={handlePrint}>
            <HiPrinter className="mr-1.5 h-4 w-4" /> Imprimir
          </Button>

          <Link href={`/treatments/new?petId=${pet.id}`}>
            <Button size="sm" className="bg-vet-primary hover:bg-vet-primary/90">
              <HiPlus className="mr-1.5 h-4 w-4" /> Nueva Consulta
            </Button>
          </Link>
        </div>
      </div>

      {/* Cabecera del Paciente */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SpeciesIcon species={pet.species} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {pet.name}
                </h1>
                <SpeciesBadge species={pet.species} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {pet.breed || 'Sin raza'} • Tutor: {pet.owner.name} ({pet.owner.phone})
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:pl-6 border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">
              Total Registros
            </span>
            <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              {historyEvents.length}
            </span>
          </div>
        </div>
      </Card>

      {/* Controles de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-6 print:hidden">
        <div className="w-full sm:w-72">
          <TextInput
            icon={HiSearch}
            placeholder="Filtrar eventos o diagnósticos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {['all', 'treatment', 'weight', 'appointment', 'vaccination'].map((type) => {
            const labels: Record<string, string> = {
              all: 'Todos',
              treatment: 'Tratamientos',
              weight: 'Pesos',
              appointment: 'Citas',
              vaccination: 'Vacunas',
            };
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  typeFilter === type
                    ? 'bg-vet-primary text-white shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                {labels[type]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cronología de Eventos Inmutables */}
      {filteredEvents.length === 0 ? (
        <Card className="text-center py-12">
          <span className="text-4xl block mb-2">📋</span>
          <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">
            {searchTerm || typeFilter !== 'all'
              ? 'No hay registros con los filtros seleccionados'
              : 'Expediente clínico sin eventos'}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
            Cada tratamiento, cita o actualización de peso generará automáticamente un registro inmutable en esta línea de tiempo.
          </p>
          {(searchTerm || typeFilter !== 'all') && (
            <Button
              size="xs"
              color="light"
              className="inline-block mx-auto"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
              }}
            >
              Restablecer filtros
            </Button>
          )}
        </Card>
      ) : (
        <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-700 space-y-6">
          {filteredEvents.map((evt) => {
            const d =
              evt.date instanceof Date
                ? evt.date
                : (evt.date as any)?.toDate
                ? (evt.date as any).toDate()
                : new Date(evt.date as any);

            const details = (evt as any).details;

            return (
              <div key={evt.id} className="relative">
                {/* Indicador en la línea de tiempo */}
                <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-vet-primary border-2 border-white ring-2 ring-vet-primary/20" />

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs hover:border-gray-200 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {getEventBadge(evt.type)}
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                        {evt.summary}
                      </h4>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      {format(d, "EEEE d 'de' MMMM, yyyy - hh:mm a", { locale: es })}
                    </span>
                  </div>

                  {details && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-750 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
                      {evt.type === 'weight' && (
                        <p>
                          <span className="font-semibold">Peso registrado:</span>{' '}
                          {details.weightKg} kg
                        </p>
                      )}
                      {evt.type === 'treatment' && (
                        <div>
                          <p>
                            <span className="font-semibold">Diagnóstico:</span>{' '}
                            {details.diagnosis}
                          </p>
                          {details.medicationCount !== undefined && (
                            <p className="mt-0.5 text-gray-500">
                              {details.medicationCount} medicamento(s) prescrito(s)
                            </p>
                          )}
                        </div>
                      )}
                      {evt.type === 'appointment' && (
                        <div>
                          <p>
                            <span className="font-semibold">Motivo:</span>{' '}
                            {details.reason}
                          </p>
                          {details.status && (
                            <p className="mt-0.5 text-gray-500">
                              Estado: {details.status}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
