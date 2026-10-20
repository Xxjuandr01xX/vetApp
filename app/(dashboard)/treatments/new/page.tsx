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
import { HiArrowLeft, HiPlus, HiTrash, HiExclamationCircle } from 'react-icons/hi';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBcvRates } from '@/lib/hooks/useBcvRates';
import { getPets } from '@/lib/services/pets';
import { createTreatment } from '@/lib/services/treatments';
import { Pet } from '@/lib/types/pet';
import { TreatmentMedication, ServicePrice } from '@/lib/types/treatment';
import { MedicationSearchModal } from '@/components/domain/MedicationSearchModal';
import { calcVES, formatVES, buildServicePrice } from '@/lib/utils/currency';

function NewTreatmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPetId = searchParams.get('petId') || '';

  const { user } = useAuth();

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState(preselectedPetId);
  const [loadingPets, setLoadingPets] = useState(true);

  // Campos del tratamiento
  const [diagnosis, setDiagnosis] = useState('');
  const [weightAtVisit, setWeightAtVisit] = useState('');
  const [medications, setMedications] = useState<TreatmentMedication[]>([]);
  const [proceduresText, setProceduresText] = useState('');
  const [recommendations, setRecommendations] = useState('');

  // Modal vademécum
  const [showMedModal, setShowMedModal] = useState(false);

  // Módulo de precios y tasa BCV (Sprint 6)
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
          const currentPet = data.find((p) => p.id === preselectedPetId);
          if (currentPet?.weightKg) {
            setWeightAtVisit(currentPet.weightKg.toString());
          }
        } else if (data.length > 0) {
          setSelectedPetId((prev) => {
            if (prev) return prev;
            if (data[0].weightKg) setWeightAtVisit(data[0].weightKg.toString());
            return data[0].id;
          });
        }
      } catch (err) {
        console.error('Error cargando mascotas:', err);
      } finally {
        setLoadingPets(false);
      }
    }
    loadPetsList();
  }, [user, preselectedPetId]);

  const handleAddMedication = (med: TreatmentMedication) => {
    setMedications((prev) => [...prev, med]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedPetId) {
      setError('Debes seleccionar un paciente');
      return;
    }

    if (!diagnosis.trim()) {
      setError('El diagnóstico es requerido');
      return;
    }

    const pet = pets.find((p) => p.id === selectedPetId);

    setSaving(true);
    setError('');

    const procedures = proceduresText
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

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

    const res = await createTreatment(user.uid, {
      petId: selectedPetId,
      petName: pet?.name,
      diagnosis: diagnosis.trim(),
      weightAtVisit: weightAtVisit ? parseFloat(weightAtVisit) : undefined,
      medications,
      procedures,
      recommendations: recommendations.trim() || undefined,
      servicePrice,
    });

    setSaving(false);

    if (res.success) {
      router.push(`/pets/${selectedPetId}?shareTreatmentId=${res.treatmentId || ''}`);
    } else {
      setError(res.error || 'Error al guardar el tratamiento');
    }
  };

  const selectedPet = pets.find((p) => p.id === selectedPetId);

  return (
    <div className="pb-24 sm:pb-8 max-w-3xl mx-auto">
      <div className="mb-4">
        <Link
          href={preselectedPetId ? `/pets/${preselectedPetId}` : '/treatments'}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <HiArrowLeft className="mr-1.5 h-4 w-4" /> Volver
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Registrar Tratamiento Clínico</h1>
        <p className="text-sm text-gray-500">
          Diagnóstico, prescripción de medicamentos y recomendaciones médicas.
        </p>
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
            Aún no tienes pacientes registrados para crear un tratamiento.
          </p>
          <Link href="/pets/new" className="inline-block mx-auto">
            <Button className="bg-vet-primary hover:bg-vet-primary/90">
              Registrar paciente primero
            </Button>
          </Link>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del Paciente & Consulta */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-3">
              🐾 Datos de la Consulta
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pet-select" value="Paciente *" className="mb-1 block" />
                <Select
                  id="pet-select"
                  value={selectedPetId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedPetId(id);
                    const p = pets.find((pet) => pet.id === id);
                    if (p?.weightKg) setWeightAtVisit(p.weightKg.toString());
                  }}
                  required
                >
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.species} - Tutor: {p.owner.name})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="weight" value="Peso en esta visita (kg)" className="mb-1 block" />
                <TextInput
                  id="weight"
                  type="number"
                  step="0.01"
                  placeholder="Ej. 14.2"
                  value={weightAtVisit}
                  onChange={(e) => setWeightAtVisit(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-2">
              <Label htmlFor="diagnosis" value="Diagnóstico principal *" className="mb-1 block" />
              <TextInput
                id="diagnosis"
                placeholder="Ej. Gastroenteritis infecciosa aguda, Otitis externa bilateral..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                required
              />
            </div>
          </Card>

          {/* Receta y Medicamentos */}
          <Card>
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold text-gray-800">
                💊 Medicamentos Recetados ({medications.length})
              </h2>

              <Button
                size="xs"
                color="light"
                onClick={() => setShowMedModal(true)}
              >
                <HiPlus className="mr-1 h-3.5 w-3.5" /> Agregar del Vademécum
              </Button>
            </div>

            {medications.length === 0 ? (
              <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                No has agregado medicamentos a la receta. Haz clic en &quot;Agregar del Vademécum&quot; para buscar fármacos y dosis.
              </div>
            ) : (
              <div className="space-y-3">
                {medications.map((med, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white rounded-lg border border-gray-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{med.commercialName}</span>
                        <span className="text-xs text-gray-500">({med.activeIngredient})</span>
                      </div>
                      <p className="text-xs text-gray-700 mt-0.5">
                        Dosis: <strong>{med.dose}</strong> ({med.route}) • {med.frequency} por {med.durationDays} días
                      </p>
                      {med.notes && (
                        <p className="text-xs text-gray-400 italic mt-0.5">
                          Indicaciones: {med.notes}
                        </p>
                      )}
                    </div>

                    <Button
                      size="xs"
                      color="failure"
                      onClick={() => handleRemoveMedication(index)}
                    >
                      <HiTrash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Procedimientos y Recomendaciones */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-3">
              🩺 Procedimientos y Cuidados
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="procedures" value="Procedimientos realizados (separados por coma)" className="mb-1 block" />
                <TextInput
                  id="procedures"
                  placeholder="Ej. Fluidoterapia SC, Limpieza ótica, Curación de herida..."
                  value={proceduresText}
                  onChange={(e) => setProceduresText(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="recommendations" value="Recomendaciones y cuidados en casa" className="mb-1 block" />
                <Textarea
                  id="recommendations"
                  rows={3}
                  placeholder="Ej. Mantener en reposo 48h, dieta blanda (pollo y arroz), control médico en 5 días..."
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Honorarios y Presupuesto (Sprint 6: BCV & Precios) */}
          <Card>
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span>💰</span> Honorarios y Presupuesto
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Calcula el costo del servicio en USD y Bolívares con la tasa oficial BCV.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={includePricing}
                  onChange={(e) => setIncludePricing(e.target.checked)}
                  className="rounded border-gray-300 text-vet-primary focus:ring-vet-primary"
                />
                <span>Incluir costo</span>
              </label>
            </div>

            {includePricing && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount-usd" value="Monto en Dólares (USD) *" className="mb-1 block" />
                    <TextInput
                      id="amount-usd"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ej. 25.00"
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
                    <Label htmlFor="custom-rate" value="Tasa personalizada (Bs. por USD)" className="mb-1 block" />
                    <TextInput
                      id="custom-rate"
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

          <div className="flex justify-end gap-3 pt-2">
            <Link href={preselectedPetId ? `/pets/${preselectedPetId}` : '/treatments'}>
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
                  <Spinner size="sm" className="mr-2" /> Guardando...
                </>
              ) : (
                'Guardar Tratamiento'
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Modal para buscar en el Vademécum */}
      <MedicationSearchModal
        show={showMedModal}
        onClose={() => setShowMedModal(false)}
        onSelect={handleAddMedication}
        species={selectedPet?.species}
        weightKg={parseFloat(weightAtVisit) || selectedPet?.weightKg || undefined}
      />
    </div>
  );
}

export default function NewTreatmentPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-16">
          <Spinner size="lg" color="info" />
        </div>
      }
    >
      <NewTreatmentForm />
    </Suspense>
  );
}
