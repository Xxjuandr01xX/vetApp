'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Modal,
  Label,
  TextInput,
  Select,
  Textarea,
  Button,
  Alert,
  Checkbox,
} from 'flowbite-react';
import { HiExclamationCircle, HiSparkles, HiPlus } from 'react-icons/hi';
import { useAuth } from '@/lib/hooks/useAuth';
import { createCustomMedication } from '@/lib/services/medications';
import { Medication } from '@/lib/types/medication';
import { SPECIES_LIST } from '@/lib/constants';

interface CustomMedicationModalProps {
  show: boolean;
  onClose: () => void;
  onCreated?: (med: Medication) => void;
}

const THERAPEUTIC_CLASSES = [
  'Antibacteriano',
  'Antiinflamatorio (AINE)',
  'Corticosteroide',
  'Analgésico / Opioide',
  'Antiparasitario interno',
  'Antiparasitario externo',
  'Antiemético / Gastroprotector',
  'Cardiovascular / Diurético',
  'Dermatológico / Ótico',
  'Suplemento / Vitamínico',
  'Fórmula Magistral / Otro',
];

export function CustomMedicationModal({
  show,
  onClose,
  onCreated,
}: CustomMedicationModalProps) {
  const { user, profile } = useAuth();
  const isPremiumOrAdmin =
    profile?.role === 'premium' || profile?.role === 'admin';

  const [commercialName, setCommercialName] = useState('');
  const [activeIngredientName, setActiveIngredientName] = useState('');
  const [concentration, setConcentration] = useState('');
  const [unit, setUnit] = useState('mg/ml');
  const [therapeuticClass, setTherapeuticClass] = useState('Antibacteriano');
  const [presentationForm, setPresentationForm] = useState('Suspensión oral');
  const [route, setRoute] = useState('Oral');
  const [defaultDoseMgPerKg, setDefaultDoseMgPerKg] = useState('10');
  const [targetSpecies, setTargetSpecies] = useState<string[]>(['Canino', 'Felino']);
  const [indications, setIndications] = useState('');
  const [contraindications, setContraindications] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleSpecies = (sp: string) => {
    setTargetSpecies((prev) =>
      prev.includes(sp) ? prev.filter((item) => item !== sp) : [...prev, sp]
    );
  };

  const resetForm = () => {
    setCommercialName('');
    setActiveIngredientName('');
    setConcentration('');
    setUnit('mg/ml');
    setTherapeuticClass('Antibacteriano');
    setPresentationForm('Suspensión oral');
    setRoute('Oral');
    setDefaultDoseMgPerKg('10');
    setTargetSpecies(['Canino', 'Felino']);
    setIndications('');
    setContraindications('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');

    const parsedDose = parseFloat(defaultDoseMgPerKg);

    const res = await createCustomMedication(
      user.uid,
      {
        commercialName,
        activeIngredientName,
        concentration,
        unit,
        therapeuticClass,
        presentationForm,
        route,
        targetSpecies,
        defaultDoseMgPerKg: parsedDose > 0 ? parsedDose : undefined,
        indications,
        contraindications,
      },
      isPremiumOrAdmin
    );

    setSaving(false);

    if (res.success && res.medication) {
      resetForm();
      onCreated?.(res.medication);
      onClose();
    } else {
      setError(res.error || 'No se pudo crear el medicamento personalizado');
    }
  };

  return (
    <Modal show={show} size="xl" onClose={onClose}>
      <Modal.Header>
        <span className="flex items-center gap-2">
          <span>💊 Nuevo Medicamento Personalizado</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
            💎 Premium
          </span>
        </span>
      </Modal.Header>

      <Modal.Body>
        {!isPremiumOrAdmin ? (
          <div className="p-6 text-center space-y-4 bg-amber-50/60 rounded-xl border border-amber-200">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <HiSparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Función Exclusiva del Plan Premium
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Con el <strong>Plan Premium</strong> puedes registrar tus propias fórmulas magistrales, presentaciones compuestas y medicamentos personalizados con cálculo automático de dosis por peso.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/pricing" onClick={onClose}>
                <Button className="bg-vet-primary hover:bg-vet-primary/90">
                  💎 Ver Plan Premium
                </Button>
              </Link>
              <Button color="light" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form id="custom-med-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert color="failure" icon={HiExclamationCircle}>
                {error}
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label value="Nombre Comercial o Fórmula *" className="mb-1 block" />
                <TextInput
                  placeholder="Ej. DoxiPet Jarabe Magistral"
                  value={commercialName}
                  onChange={(e) => setCommercialName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label value="Principio Activo *" className="mb-1 block" />
                <TextInput
                  placeholder="Ej. Doxiciclina Hiclato"
                  value={activeIngredientName}
                  onChange={(e) => setActiveIngredientName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label value="Concentración Numérica *" className="mb-1 block" />
                <div className="flex gap-2">
                  <TextInput
                    className="flex-1"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Ej. 50"
                    value={concentration}
                    onChange={(e) => setConcentration(e.target.value)}
                    required
                  />
                  <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                    <option value="mg/ml">mg/ml</option>
                    <option value="mg">mg (por comp.)</option>
                    <option value="g">g</option>
                    <option value="UI/ml">UI/ml</option>
                    <option value="%">%</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label value="Dosis de referencia (mg/kg)" className="mb-1 block" />
                <TextInput
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Ej. 10"
                  value={defaultDoseMgPerKg}
                  onChange={(e) => setDefaultDoseMgPerKg(e.target.value)}
                  helperText="Usada en la calculadora automática por peso"
                />
              </div>

              <div>
                <Label value="Clase Terapéutica *" className="mb-1 block" />
                <Select
                  value={therapeuticClass}
                  onChange={(e) => setTherapeuticClass(e.target.value)}
                >
                  {THERAPEUTIC_CLASSES.map((tc) => (
                    <option key={tc} value={tc}>
                      {tc}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label value="Forma Farmacéutica *" className="mb-1 block" />
                <Select
                  value={presentationForm}
                  onChange={(e) => setPresentationForm(e.target.value)}
                >
                  <option value="Suspensión oral">Suspensión oral (ml)</option>
                  <option value="Inyectable">Solución Inyectable (ml)</option>
                  <option value="Comprimidos">Comprimidos</option>
                  <option value="Tabletas">Tabletas</option>
                  <option value="Cápsulas">Cápsulas</option>
                  <option value="Gotas">Gotas</option>
                  <option value="Tópico / Crema">Tópico / Crema</option>
                </Select>
              </div>

              <div>
                <Label value="Vía de Administración *" className="mb-1 block" />
                <Select value={route} onChange={(e) => setRoute(e.target.value)}>
                  <option value="Oral">Oral</option>
                  <option value="Subcutánea">Subcutánea (SC)</option>
                  <option value="Intramuscular">Intramuscular (IM)</option>
                  <option value="Intravenosa">Intravenosa (IV)</option>
                  <option value="Tópica">Tópica</option>
                  <option value="Ótica">Ótica</option>
                  <option value="Oftálmica">Oftálmica</option>
                </Select>
              </div>

              <div>
                <Label value="Especies Destino *" className="mb-1 block" />
                <div className="flex flex-wrap gap-2 pt-1">
                  {SPECIES_LIST.map((sp) => (
                    <label
                      key={sp}
                      className="inline-flex items-center gap-1.5 text-xs bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 cursor-pointer"
                    >
                      <Checkbox
                        checked={targetSpecies.includes(sp)}
                        onChange={() => toggleSpecies(sp)}
                      />
                      <span>{sp}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label value="Indicaciones (separadas por coma)" className="mb-1 block" />
                <Textarea
                  rows={2}
                  placeholder="Ej. Ehrlichiosis canina, Infecciones respiratorias"
                  value={indications}
                  onChange={(e) => setIndications(e.target.value)}
                />
              </div>

              <div>
                <Label value="Contraindicaciones" className="mb-1 block" />
                <Textarea
                  rows={2}
                  placeholder="Ej. Hembras gestantes, cachorros menores de 4 semanas"
                  value={contraindications}
                  onChange={(e) => setContraindications(e.target.value)}
                />
              </div>
            </div>
          </form>
        )}
      </Modal.Body>

      {isPremiumOrAdmin && (
        <Modal.Footer className="flex justify-end gap-2">
          <Button color="gray" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="custom-med-form"
            isProcessing={saving}
            className="bg-vet-primary hover:bg-vet-primary/90"
          >
            <HiPlus className="mr-1.5 h-4 w-4" /> Guardar Medicamento
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
}
