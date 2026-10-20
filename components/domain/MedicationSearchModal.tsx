'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, TextInput, Select, Button, Badge } from 'flowbite-react';
import { HiSearch, HiPlus, HiCalculator, HiCheck } from 'react-icons/hi';
import { useAuth } from '@/lib/hooks/useAuth';
import { searchMedications } from '@/lib/services/medications';
import { Medication } from '@/lib/types/medication';
import { TreatmentMedication } from '@/lib/types/treatment';
import {
  calculateDoseByWeight,
  getSuggestedDoseMgPerKg,
  parsePresentationConcentration,
  DoseUnitType,
} from '@/lib/utils/dosage-calculator';
import { CustomMedicationModal } from './CustomMedicationModal';

interface MedicationSearchModalProps {
  show: boolean;
  onClose: () => void;
  onSelect: (med: TreatmentMedication) => void;
  species?: string;
  weightKg?: number;
}

export function MedicationSearchModal({
  show,
  onClose,
  onSelect,
  species,
  weightKg,
}: MedicationSearchModalProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Medication[]>([]);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Calculadora de dosis por peso (Sprint 11)
  const [calcWeight, setCalcWeight] = useState<string>(
    weightKg && weightKg > 0 ? weightKg.toString() : ''
  );
  const [calcDoseMgKg, setCalcDoseMgKg] = useState<string>('10');
  const [calcConc, setCalcConc] = useState<string>('50');
  const [calcUnitType, setCalcUnitType] = useState<DoseUnitType>('ml');

  // Formulario de prescripción para el medicamento seleccionado
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('Cada 12 horas');
  const [durationDays, setDurationDays] = useState('7');
  const [route, setRoute] = useState('Oral');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (weightKg && weightKg > 0) {
      setCalcWeight(weightKg.toString());
    }
  }, [weightKg]);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchMedications(searchTerm, species, user?.uid).then((res) => {
        if (!cancelled) setResults(res);
      });
    }, searchTerm ? 400 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [show, searchTerm, species, user?.uid]);

  const handleSelectMed = (med: Medication) => {
    setSelectedMed(med);

    const suggestedMgKg = getSuggestedDoseMgPerKg(med);
    setCalcDoseMgKg(suggestedMgKg.toString());

    const primaryPres = med.presentations?.[0];
    const fallbackConcText = med.activeIngredients?.[0]
      ? `${med.activeIngredients[0].concentration}${med.activeIngredients[0].unit}`
      : '100mg';

    const parsedPres = parsePresentationConcentration(
      primaryPres?.concentration || fallbackConcText,
      primaryPres?.form || ''
    );

    setCalcConc(parsedPres.concentrationMgPerUnit.toString());
    setCalcUnitType(parsedPres.unitType);
    setRoute(primaryPres?.route || 'Oral');

    const w = parseFloat(calcWeight);
    if (w > 0 && suggestedMgKg > 0 && parsedPres.concentrationMgPerUnit > 0) {
      const calcResult = calculateDoseByWeight({
        weightKg: w,
        doseMgPerKg: suggestedMgKg,
        concentrationMgPerUnit: parsedPres.concentrationMgPerUnit,
        unitType: parsedPres.unitType,
      });
      setDose(calcResult.formattedDose);
    } else if (primaryPres) {
      setDose(primaryPres.concentration || '1 unidad');
    } else {
      setDose('1 tableta');
    }
  };

  const handlePresentationChange = (presIndex: number) => {
    if (!selectedMed?.presentations?.[presIndex]) return;
    const pres = selectedMed.presentations[presIndex];
    const parsed = parsePresentationConcentration(pres.concentration, pres.form);
    setCalcConc(parsed.concentrationMgPerUnit.toString());
    setCalcUnitType(parsed.unitType);
    if (pres.route) setRoute(pres.route);
  };

  // Cálculo reactivo de la dosis según peso
  const liveCalcResult = useMemo(() => {
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

  const applyCalculatedDose = () => {
    if (liveCalcResult) {
      setDose(liveCalcResult.formattedDose);
    }
  };

  const handleConfirm = () => {
    if (!selectedMed) return;

    onSelect({
      medicationId: selectedMed.id,
      commercialName: selectedMed.commercialNames[0] || selectedMed.id,
      activeIngredient: selectedMed.activeIngredients.map((i) => i.name).join(' + '),
      dose: dose.trim() || '1 unidad',
      route,
      frequency,
      durationDays: parseInt(durationDays, 10) || 7,
      notes: notes.trim() || undefined,
    });

    setSelectedMed(null);
    onClose();
  };

  return (
    <>
      <Modal show={show} size="xl" onClose={onClose}>
        <Modal.Header>
          {selectedMed
            ? `Prescribir: ${selectedMed.commercialNames[0]}`
            : 'Buscar en el Vademécum'}
        </Modal.Header>

        <Modal.Body>
          {!selectedMed ? (
            <div>
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="flex-1">
                  <TextInput
                    icon={HiSearch}
                    placeholder="Buscar por nombre comercial o principio activo (ej. Amox, Metacam, Melox)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button
                  size="sm"
                  color="light"
                  onClick={() => setShowCustomModal(true)}
                  className="shrink-0"
                >
                  <HiPlus className="mr-1.5 h-4 w-4 text-vet-primary" />
                  Crear Personalizado
                </Button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2.5">
                {results.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>No se encontraron medicamentos en el catálogo para esta búsqueda.</p>
                    <Button
                      size="xs"
                      color="light"
                      className="mt-3 mx-auto"
                      onClick={() => setShowCustomModal(true)}
                    >
                      <HiPlus className="mr-1 h-3.5 w-3.5" /> Registrar como medicamento personalizado
                    </Button>
                  </div>
                ) : (
                  results.map((med) => (
                    <div
                      key={med.id}
                      className="p-3 border rounded-xl hover:border-vet-primary hover:bg-blue-50/20 transition-all cursor-pointer flex items-center justify-between"
                      onClick={() => handleSelectMed(med)}
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900">
                            {med.commercialNames.join(' / ')}
                          </span>
                          <Badge color="info">{med.therapeuticClass}</Badge>
                          {!med.isGlobal && (
                            <Badge color="warning">💎 Personalizado</Badge>
                          )}
                        </div>

                        <p className="text-xs text-gray-600 mt-0.5">
                          Principio activo:{' '}
                          <strong className="text-gray-800">
                            {med.activeIngredients
                              .map((i) => `${i.name} ${i.concentration}${i.unit}`)
                              .join(' + ')}
                          </strong>
                        </p>

                        <p className="text-xs text-gray-400 mt-0.5">
                          Especies: {med.targetSpecies.join(', ')}
                        </p>
                      </div>

                      <Button size="xs" color="light">
                        <HiPlus className="mr-1 h-3.5 w-3.5" /> Seleccionar
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumen del fármaco */}
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-900 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{selectedMed.commercialNames.join(' / ')}</p>
                  <p className="text-xs mt-0.5">
                    {selectedMed.activeIngredients
                      .map((i) => `${i.name} (${i.concentration} ${i.unit})`)
                      .join(' + ')}{' '}
                    • {selectedMed.pharmacologicalAction}
                  </p>
                </div>

                {selectedMed.presentations && selectedMed.presentations.length > 1 && (
                  <Select
                    sizing="sm"
                    onChange={(e) => handlePresentationChange(parseInt(e.target.value, 10))}
                  >
                    {selectedMed.presentations.map((p, idx) => (
                      <option key={p.id || idx} value={idx}>
                        {p.form} — {p.concentration}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              {/* Calculadora de Dosis por Peso (Sprint 11) */}
              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <HiCalculator className="w-4 h-4 text-emerald-600" />
                    Calculadora de Dosis por Peso
                  </h4>
                  {liveCalcResult && (
                    <Button
                      size="xs"
                      color="success"
                      onClick={applyCalculatedDose}
                    >
                      <HiCheck className="mr-1 h-3.5 w-3.5" /> Aplicar cálculo
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-2xs font-semibold text-gray-600 block mb-1">
                      Peso Paciente (kg)
                    </label>
                    <TextInput
                      sizing="sm"
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="Ej. 12.5"
                      value={calcWeight}
                      onChange={(e) => setCalcWeight(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-gray-600 block mb-1">
                      Dosis (mg/kg)
                    </label>
                    <TextInput
                      sizing="sm"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Ej. 12.5"
                      value={calcDoseMgKg}
                      onChange={(e) => setCalcDoseMgKg(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-gray-600 block mb-1">
                      Concentración (mg)
                    </label>
                    <TextInput
                      sizing="sm"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Ej. 50"
                      value={calcConc}
                      onChange={(e) => setCalcConc(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-gray-600 block mb-1">
                      Por unidad de
                    </label>
                    <Select
                      sizing="sm"
                      value={calcUnitType}
                      onChange={(e) => setCalcUnitType(e.target.value as DoseUnitType)}
                    >
                      <option value="ml">ml (Líquido/Iny.)</option>
                      <option value="comprimido">Comprimido</option>
                      <option value="tableta">Tableta</option>
                      <option value="capsula">Cápsula</option>
                      <option value="gota">Gota</option>
                    </Select>
                  </div>
                </div>

                {liveCalcResult ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-emerald-900 border-t border-emerald-200/70">
                    <span>
                      Requerimiento: <strong>{liveCalcResult.totalMg} mg</strong> totales por toma
                    </span>
                    <span className="font-bold text-sm text-emerald-700 bg-white px-2.5 py-0.5 rounded-md border border-emerald-200">
                      Administrar: {liveCalcResult.unitsToAdminister} {liveCalcResult.unitLabel}
                    </span>
                  </div>
                ) : (
                  <p className="text-2xs text-emerald-700">
                    Ingresa el peso del paciente en kg para calcular automáticamente los miligramos y unidades exactas.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Dosis a prescribir *
                  </label>
                  <TextInput
                    placeholder="Ej. 1 comprimido, 2.5 ml"
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Vía de administración *
                  </label>
                  <TextInput
                    placeholder="Ej. Oral, Subcutánea"
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Frecuencia *
                  </label>
                  <TextInput
                    placeholder="Ej. Cada 12 horas, Cada 24 horas"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Duración (días) *
                  </label>
                  <TextInput
                    type="number"
                    placeholder="Ej. 7"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Instrucciones adicionales (opcional)
                </label>
                <TextInput
                  placeholder="Ej. Administrar junto con el alimento..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="flex justify-between">
          {selectedMed ? (
            <>
              <Button color="light" onClick={() => setSelectedMed(null)}>
                ← Volver al buscador
              </Button>
              <Button
                className="bg-vet-primary hover:bg-vet-primary/90"
                onClick={handleConfirm}
              >
                Agregar al tratamiento
              </Button>
            </>
          ) : (
            <Button color="gray" onClick={onClose}>
              Cerrar
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <CustomMedicationModal
        show={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onCreated={(newMed) => {
          setResults((prev) => [newMed, ...prev]);
          handleSelectMed(newMed);
        }}
      />
    </>
  );
}
