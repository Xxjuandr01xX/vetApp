'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  TextInput,
  Select,
  Button,
  Badge,
  Spinner,
} from 'flowbite-react';
import {
  HiSearch,
  HiPlus,
  HiTrash,
  HiCalculator,
  HiSparkles,
} from 'react-icons/hi';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  searchMedications,
  deleteCustomMedication,
} from '@/lib/services/medications';
import { Medication } from '@/lib/types/medication';
import {
  calculateDoseByWeight,
  getSuggestedDoseMgPerKg,
  parsePresentationConcentration,
  DoseUnitType,
} from '@/lib/utils/dosage-calculator';
import { CustomMedicationModal } from '@/components/domain/CustomMedicationModal';
import { SPECIES_LIST } from '@/lib/constants';

export default function MedicationsVademecumPage() {
  const { user, profile } = useAuth();
  const isPremiumOrAdmin =
    profile?.role === 'premium' || profile?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [onlyCustom, setOnlyCustom] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Estado de la Calculadora de Dosis por Peso Rápida
  const [calcMed, setCalcMed] = useState<Medication | null>(null);
  const [calcWeight, setCalcWeight] = useState('10');
  const [calcDoseMgKg, setCalcDoseMgKg] = useState('12.5');
  const [calcConc, setCalcConc] = useState('50');
  const [calcUnitType, setCalcUnitType] = useState<DoseUnitType>('ml');

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const results = await searchMedications(
        searchTerm,
        speciesFilter || undefined,
        user?.uid
      );
      setMedications(results);
    } catch (err) {
      console.error('Error cargando vademécum:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, speciesFilter, user?.uid]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCatalog();
    }, searchTerm ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadCatalog, searchTerm]);

  const displayedMeds = useMemo(() => {
    if (!onlyCustom) return medications;
    return medications.filter((m) => !m.isGlobal);
  }, [medications, onlyCustom]);

  const handleSelectForCalc = (med: Medication) => {
    setCalcMed(med);
    const suggested = getSuggestedDoseMgPerKg(med);
    setCalcDoseMgKg(suggested.toString());

    const pres = med.presentations?.[0];
    const fallbackConc = med.activeIngredients?.[0]
      ? `${med.activeIngredients[0].concentration}${med.activeIngredients[0].unit}`
      : '100mg';
    const parsed = parsePresentationConcentration(
      pres?.concentration || fallbackConc,
      pres?.form || ''
    );
    setCalcConc(parsed.concentrationMgPerUnit.toString());
    setCalcUnitType(parsed.unitType);
  };

  const handleDeleteCustom = async (medId: string, name: string) => {
    if (!user) return;
    if (!confirm(`¿Deseas eliminar tu medicamento personalizado "${name}"?`)) return;
    const res = await deleteCustomMedication(user.uid, medId);
    if (res.success) {
      setMedications((prev) => prev.filter((m) => m.id !== medId));
      if (calcMed?.id === medId) setCalcMed(null);
    }
  };

  const calcResult = useMemo(() => {
    const w = parseFloat(calcWeight);
    const d = parseFloat(calcDoseMgKg);
    const c = parseFloat(calcConc);
    if (w > 0 && d > 0 && c > 0) {
      try {
        return calculateDoseByWeight({
          weightKg: w,
          doseMgPerKg: d,
          concentrationMgPerUnit: c,
          unitType: calcUnitType,
        });
      } catch {
        return null;
      }
    }
    return null;
  }, [calcWeight, calcDoseMgKg, calcConc, calcUnitType]);

  return (
    <div className="pb-24 sm:pb-8 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Vademécum Veterinario & Calculadora de Dosis
          </h1>
          <p className="text-sm text-gray-500">
            Catálogo farmacológico global + tus fórmulas personalizadas y dosificación por peso
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCustomModal(true)}
            className="bg-vet-primary hover:bg-vet-primary/90"
          >
            <HiPlus className="mr-2 h-4 w-4" />
            Nuevo Med. Personalizado
          </Button>
        </div>
      </div>

      {/* Calculadora de Dosis por Peso Interactiva */}
      <Card className="mb-6 bg-emerald-50/40 border-emerald-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200/70">
          <div className="flex items-center gap-2">
            <HiCalculator className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-900 text-base">
              Calculadora Clínica de Dosis por Peso
            </h2>
            {calcMed && (
              <Badge color="success">
                Fármaco: {calcMed.commercialNames[0]}
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-500">
            Selecciona cualquier medicamento abajo o ingresa los valores manualmente
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Peso del Paciente (kg)
            </label>
            <TextInput
              type="number"
              step="0.1"
              min="0.1"
              value={calcWeight}
              onChange={(e) => setCalcWeight(e.target.value)}
              placeholder="Ej. 15"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Dosis Terapéutica (mg/kg)
            </label>
            <TextInput
              type="number"
              step="0.01"
              min="0.01"
              value={calcDoseMgKg}
              onChange={(e) => setCalcDoseMgKg(e.target.value)}
              placeholder="Ej. 12.5"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Concentración (mg)
            </label>
            <TextInput
              type="number"
              step="0.01"
              min="0.01"
              value={calcConc}
              onChange={(e) => setCalcConc(e.target.value)}
              placeholder="Ej. 50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Unidad Farmacéutica
            </label>
            <Select
              value={calcUnitType}
              onChange={(e) => setCalcUnitType(e.target.value as DoseUnitType)}
            >
              <option value="ml">ml (Suspensión / Inyectable)</option>
              <option value="comprimido">Comprimido</option>
              <option value="tableta">Tableta</option>
              <option value="capsula">Cápsula</option>
              <option value="gota">Gota</option>
            </Select>
          </div>
        </div>

        {calcResult && (
          <div className="mt-2 p-3 bg-white rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-sm text-gray-700">
              Para un paciente de <strong>{calcResult.weightKg} kg</strong> a razón de{' '}
              <strong>{calcResult.doseMgPerKg} mg/kg</strong>: requiere{' '}
              <strong className="text-emerald-700">{calcResult.totalMg} mg totales</strong> por dosis.
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-xs">
                Administrar: {calcResult.unitsToAdminister} {calcResult.unitLabel}
              </span>
              {calcMed && (
                <Link href={`/treatments/new?medId=${calcMed.id}`}>
                  <Button size="xs" color="light">
                    Prescribir en Récipe →
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Controles de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <TextInput
            icon={HiSearch}
            placeholder="Buscar por nombre comercial, principio activo o indicación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select
          value={speciesFilter}
          onChange={(e) => setSpeciesFilter(e.target.value)}
          className="w-full sm:w-48"
        >
          <option value="">Todas las especies</option>
          {SPECIES_LIST.map((sp) => (
            <option key={sp} value={sp}>
              {sp}
            </option>
          ))}
        </Select>

        <Button
          color={onlyCustom ? 'warning' : 'light'}
          onClick={() => setOnlyCustom((prev) => !prev)}
        >
          <HiSparkles className="mr-1.5 h-4 w-4" />
          {onlyCustom ? 'Viendo Personalizados' : 'Mis Personalizados'}
        </Button>
      </div>

      {/* Lista de Medicamentos */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="xl" />
        </div>
      ) : displayedMeds.length === 0 ? (
        <Card className="text-center py-12">
          <span className="text-4xl block mb-2">💊</span>
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            {onlyCustom
              ? 'Aún no has creado medicamentos personalizados'
              : 'No se encontraron medicamentos con este filtro'}
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
            {isPremiumOrAdmin
              ? 'Puedes agregar tus propias fórmulas magistrales y presentaciones comerciales para usarlas en tus récipes.'
              : 'Actualiza al Plan Premium para registrar tus propios medicamentos personalizados.'}
          </p>
          <Button
            onClick={() => setShowCustomModal(true)}
            className="bg-vet-primary hover:bg-vet-primary/90 mx-auto"
          >
            <HiPlus className="mr-1.5 h-4 w-4" /> Crear Medicamento Personalizado
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedMeds.map((med) => (
            <Card key={med.id} className="hover:border-vet-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900 text-base">
                      {med.commercialNames.join(' / ')}
                    </h3>
                    <Badge color="info">{med.therapeuticClass}</Badge>
                    {!med.isGlobal && (
                      <Badge color="warning">💎 Personalizado</Badge>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 mt-1">
                    <strong>Principio activo:</strong>{' '}
                    {med.activeIngredients
                      .map((i) => `${i.name} (${i.concentration} ${i.unit})`)
                      .join(' + ')}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="xs"
                    color="light"
                    onClick={() => handleSelectForCalc(med)}
                    title="Calcular dosis por peso con este fármaco"
                  >
                    <HiCalculator className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Calcular Dosis
                  </Button>
                  {!med.isGlobal && (
                    <Button
                      size="xs"
                      color="failure"
                      onClick={() =>
                        handleDeleteCustom(med.id, med.commercialNames[0] || med.id)
                      }
                      title="Eliminar medicamento personalizado"
                    >
                      <HiTrash className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-100">
                <p>
                  <strong>Especies:</strong> {med.targetSpecies.join(', ')}
                </p>
                {med.presentations && med.presentations.length > 0 && (
                  <p>
                    <strong>Presentaciones:</strong>{' '}
                    {med.presentations
                      .map((p) => `${p.form} ${p.concentration} (${p.route})`)
                      .join(' • ')}
                  </p>
                )}
                {med.indications && med.indications.length > 0 && (
                  <p>
                    <strong>Indicaciones:</strong> {med.indications.join(', ')}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <CustomMedicationModal
        show={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onCreated={(newMed) => {
          setMedications((prev) => [newMed, ...prev]);
          handleSelectForCalc(newMed);
        }}
      />
    </div>
  );
}
