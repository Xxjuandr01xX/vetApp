'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Label,
  TextInput,
  Select,
  Textarea,
  Button,
  Alert,
  Spinner,
} from 'flowbite-react';
import { HiArrowLeft, HiExclamationCircle } from 'react-icons/hi';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBcvRates } from '@/lib/hooks/useBcvRates';
import { getPets, getPetById } from '@/lib/services/pets';
import { createAppointment } from '@/lib/services/appointments';
import { Pet } from '@/lib/types/pet';
import { ServicePrice } from '@/lib/types/treatment';
import { calcVES, formatVES, buildServicePrice } from '@/lib/utils/currency';
import { format, addHours } from 'date-fns';

function NewAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPetId = searchParams.get('petId') || '';

  const { user } = useAuth();

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState(preselectedPetId);
  const [loadingPets, setLoadingPets] = useState(true);

  // Form fields
  const [date, setDate] = useState(() => {
    // Fecha y hora actual + 1 hora formateada para datetime-local
    const defaultDate = addHours(new Date(), 1);
    return format(defaultDate, "yyyy-MM-dd'T'HH:mm");
  });
  const [durationMin, setDurationMin] = useState('30');
  const [reason, setReason] = useState('Consulta general');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');

  // Honorarios y tasa BCV
  const { rates } = useBcvRates();
  const [includePricing, setIncludePricing] = useState(false);
  const [amountUSD, setAmountUSD] = useState('');
  const [isManualRate, setIsManualRate] = useState(false);
  const [customRate, setCustomRate] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const effectiveRate = isManualRate
    ? parseFloat(customRate) || 0
    : rates?.usd || 0;
  const parsedUSD = parseFloat(amountUSD) || 0;
  const calculatedVES = parsedUSD > 0 && effectiveRate > 0 ? calcVES(parsedUSD, effectiveRate) : 0;

  useEffect(() => {
    async function loadPetsList() {
      if (!user) return;
      try {
        const data = await getPets(user.uid, { status: 'active' });
        setPets(data);

        if (preselectedPetId) {
          setSelectedPetId(preselectedPetId);
        } else if (data.length > 0) {
          setSelectedPetId((prev) => prev || data[0].id);
        }
      } catch (err) {
        console.error('Error cargando mascotas:', err);
      } finally {
        setLoadingPets(false);
      }
    }
    loadPetsList();
  }, [user, preselectedPetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedPetId) {
      setError('Debes seleccionar un paciente');
      return;
    }

    const pet = pets.find((p) => p.id === selectedPetId);
    if (!pet) {
      setError('Paciente no válido');
      return;
    }

    const finalReason = reason === 'Otro' ? customReason.trim() : reason;
    if (!finalReason) {
      setError('Especifica el motivo de la consulta');
      return;
    }

    setSaving(true);
    setError('');

    let servicePrice: ServicePrice | undefined;
    if (includePricing && parsedUSD > 0 && effectiveRate > 0) {
      servicePrice = buildServicePrice({
        amountUSD: parsedUSD,
        rate: effectiveRate,
        rateDate: rates?.date || new Date().toISOString().split('T')[0],
        rateSource: isManualRate ? 'Tasa manual' : rates?.source || 'DolarAPI (BCV)',
        isManualRate,
      });
    }

    const res = await createAppointment(user.uid, {
      petId: pet.id,
      petName: pet.name,
      petSpecies: pet.species,
      ownerName: pet.owner.name,
      ownerPhone: pet.owner.phone,
      date: new Date(date),
      durationMin: parseInt(durationMin, 10),
      reason: finalReason,
      notes: notes.trim() || undefined,
      status: 'scheduled',
      servicePrice,
    });

    setSaving(false);

    if (res.success) {
      router.push('/appointments');
    } else {
      setError(res.error || 'Error al agendar la cita');
    }
  };

  return (
    <div className="pb-24 sm:pb-8 max-w-2xl mx-auto">
      <div className="mb-4">
        <Link
          href={preselectedPetId ? `/pets/${preselectedPetId}` : '/appointments'}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <HiArrowLeft className="mr-1.5 h-4 w-4" /> Volver
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Agendar Nueva Cita</h1>
        <p className="text-sm text-gray-500">Programa una consulta o control médico.</p>
      </div>

      {error && (
        <Alert color="failure" icon={HiExclamationCircle} className="mb-6">
          {error}
        </Alert>
      )}

      {loadingPets ? (
        <div className="text-center py-12">
          <Spinner size="lg" color="info" />
          <p className="mt-2 text-sm text-gray-500">Cargando pacientes...</p>
        </div>
      ) : pets.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Aún no tienes pacientes registrados para agendar una cita.
          </p>
          <Link href="/pets/new" className="inline-block mx-auto">
            <Button className="bg-vet-primary hover:bg-vet-primary/90">
              Registrar paciente primero
            </Button>
          </Link>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            {/* Selección de Paciente */}
            <div className="mb-4">
              <Label htmlFor="pet-select" value="Paciente *" className="mb-1 block" />
              <Select
                id="pet-select"
                value={selectedPetId}
                onChange={(e) => setSelectedPetId(e.target.value)}
                required
              >
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.species} - Tutor: {p.owner.name})
                  </option>
                ))}
              </Select>
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="app-date" value="Fecha y Hora *" className="mb-1 block" />
                <TextInput
                  id="app-date"
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="app-duration" value="Duración estimada" className="mb-1 block" />
                <Select
                  id="app-duration"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                >
                  <option value="15">15 minutos</option>
                  <option value="30">30 minutos (Estándar)</option>
                  <option value="45">45 minutos</option>
                  <option value="60">1 hora</option>
                  <option value="90">1 hora y media</option>
                  <option value="120">2 horas (Cirugía/Procedimiento)</option>
                </Select>
              </div>
            </div>

            {/* Motivo */}
            <div className="mb-4">
              <Label htmlFor="app-reason" value="Motivo de la cita *" className="mb-1 block" />
              <Select
                id="app-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="Consulta general">Consulta general</option>
                <option value="Vacunación">Vacunación</option>
                <option value="Desparasitación">Desparasitación</option>
                <option value="Control médico">Control médico / Seguimiento</option>
                <option value="Cirugía menor">Cirugía / Procedimiento</option>
                <option value="Limpieza dental">Profilaxis / Limpieza dental</option>
                <option value="Urgencia">Urgencia médica</option>
                <option value="Otro">Otro motivo...</option>
              </Select>
            </div>

            {reason === 'Otro' && (
              <div className="mb-4">
                <Label htmlFor="app-custom-reason" value="Especifica el motivo *" className="mb-1 block" />
                <TextInput
                  id="app-custom-reason"
                  placeholder="Ej. Toma de muestra para laboratorio"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Notas */}
            <div>
              <Label htmlFor="app-notes" value="Observaciones previas (opcional)" className="mb-1 block" />
              <Textarea
                id="app-notes"
                rows={3}
                placeholder="Ej. El dueño indica que presenta vómitos desde ayer, traer en ayunas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </Card>

          {/* Honorarios de la Cita (Opcional) */}
          <Card>
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <span>💰</span> Honorarios y Costo de la Cita
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Asigna el costo de la consulta médica (se reflejará en el comprobante y PDF).
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={includePricing}
                  onChange={(e) => setIncludePricing(e.target.checked)}
                  className="rounded border-gray-300 text-vet-primary focus:ring-vet-primary"
                />
                <span>Asignar costo</span>
              </label>
            </div>

            {includePricing && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="app-amount-usd" value="Monto en Dólares (USD) *" className="mb-1 block" />
                    <TextInput
                      id="app-amount-usd"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ej. 20.00"
                      value={amountUSD}
                      onChange={(e) => setAmountUSD(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label value="Equivalente en Bolívares (VES)" className="mb-1 block text-gray-700 font-medium" />
                    <div className="h-10 px-3 flex items-center bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-bold text-base">
                      {calculatedVES > 0 ? formatVES(calculatedVES) : 'Bs. 0,00'}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">Tasa aplicada:</span>
                    <span>
                      {isManualRate ? 'Tasa personalizada' : 'Tasa oficial BCV'}:{' '}
                      <strong>{effectiveRate > 0 ? formatVES(effectiveRate) : 'No disponible'}</strong>
                      {!isManualRate && rates?.date ? ` (${rates.date})` : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isManualRate && !customRate && rates?.usd) {
                        setCustomRate(rates.usd.toString());
                      }
                      setIsManualRate(!isManualRate);
                    }}
                    className="text-xs text-vet-primary underline hover:text-blue-800 self-start sm:self-auto"
                  >
                    {isManualRate ? 'Usar tasa oficial del BCV' : 'Modificar tasa manualmente'}
                  </button>
                </div>

                {isManualRate && (
                  <div>
                    <Label htmlFor="app-custom-rate" value="Tasa personalizada (Bs. por USD)" className="mb-1 block" />
                    <TextInput
                      id="app-custom-rate"
                      type="number"
                      step="0.0001"
                      placeholder="Ej. 876.80"
                      value={customRate}
                      onChange={(e) => setCustomRate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="flex justify-end gap-3">
            <Link href="/appointments">
              <Button color="gray" disabled={saving}>
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              className="bg-vet-primary hover:bg-vet-primary/90"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Agendando...
                </>
              ) : (
                'Agendar Cita'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-16">
          <Spinner size="lg" color="info" />
        </div>
      }
    >
      <NewAppointmentForm />
    </Suspense>
  );
}
