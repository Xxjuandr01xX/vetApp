'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Label,
  TextInput,
  Select,
  Checkbox,
  Textarea,
  Button,
  Alert,
  Spinner,
} from 'flowbite-react';
import { HiArrowLeft, HiExclamationCircle } from 'react-icons/hi';
import { getPetById, updatePet } from '@/lib/services/pets';
import { SPECIES } from '@/lib/constants';
import { Species } from '@/lib/types/pet';

export default function EditPetPage() {
  const params = useParams();
  const router = useRouter();
  const petId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Campos de la mascota
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>('Canino');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [neutered, setNeutered] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [color, setColor] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [chronicText, setChronicText] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'deceased'>('active');

  // Campos del propietario
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');

  useEffect(() => {
    async function loadPet() {
      if (!petId) return;
      try {
        const pet = await getPetById(petId);
        if (!pet) {
          setError('Paciente no encontrado');
          return;
        }

        setName(pet.name);
        setSpecies(pet.species);
        setBreed(pet.breed || '');
        setSex(pet.sex);
        setNeutered(pet.neutered);

        if (pet.birthDate) {
          const raw = pet.birthDate as any;
          const d = raw?.toDate ? raw.toDate() : new Date(raw);
          setBirthDate(d.toISOString().split('T')[0]);
        }

        setWeightKg(pet.weightKg ? pet.weightKg.toString() : '');
        setColor(pet.color || '');
        setMicrochip(pet.microchip || '');
        setAllergiesText(pet.allergies?.join(', ') || '');
        setChronicText(pet.chronicConditions?.join(', ') || '');
        setNotes(pet.notes || '');
        setStatus(pet.status || 'active');

        setOwnerName(pet.owner.name);
        setOwnerPhone(pet.owner.phone);
        setOwnerEmail(pet.owner.email || '');
        setOwnerAddress(pet.owner.address || '');
      } catch (err) {
        console.error('Error cargando paciente:', err);
        setError('Error al cargar datos del paciente');
      } finally {
        setLoading(false);
      }
    }

    loadPet();
  }, [petId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre de la mascota es requerido');
      return;
    }
    if (!ownerName.trim()) {
      setError('El nombre del dueño es requerido');
      return;
    }

    setSaving(true);
    setError('');

    const allergies = allergiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const chronicConditions = chronicText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updateData = {
      name: name.trim(),
      species,
      breed: breed.trim() || undefined,
      sex,
      neutered,
      birthDate: birthDate ? new Date(birthDate) : null,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      color: color.trim() || undefined,
      microchip: microchip.trim() || undefined,
      owner: {
        name: ownerName.trim(),
        phone: ownerPhone.trim(),
        email: ownerEmail.trim() || undefined,
        address: ownerAddress.trim() || undefined,
      },
      allergies,
      chronicConditions,
      notes: notes.trim() || undefined,
      status,
    };

    const res = await updatePet(petId, updateData);
    setSaving(false);

    if (res.success) {
      router.push(`/pets/${petId}`);
    } else {
      setError(res.error || 'Error al actualizar el paciente');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <Spinner size="xl" color="info" />
        <p className="mt-3 text-sm text-gray-500">Cargando paciente...</p>
      </div>
    );
  }

  return (
    <div className="pb-24 sm:pb-8 max-w-3xl mx-auto">
      <div className="mb-4">
        <Link
          href={`/pets/${petId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <HiArrowLeft className="mr-1.5 h-4 w-4" /> Cancelar y volver a la ficha
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Editar Ficha de {name}</h1>
        <p className="text-sm text-gray-500">Actualiza los datos médicos o del propietario.</p>
      </div>

      {error && (
        <Alert color="failure" icon={HiExclamationCircle} className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-3">
            🐾 Datos del Paciente
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pet-name" value="Nombre *" className="mb-1 block" />
              <TextInput
                id="pet-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="pet-species" value="Especie *" className="mb-1 block" />
              <Select
                id="pet-species"
                value={species}
                onChange={(e) => setSpecies(e.target.value as Species)}
                required
              >
                {SPECIES.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="pet-breed" value="Raza" className="mb-1 block" />
              <TextInput
                id="pet-breed"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="pet-sex" value="Sexo *" className="mb-1 block" />
              <Select
                id="pet-sex"
                value={sex}
                onChange={(e) => setSex(e.target.value as 'M' | 'F')}
              >
                <option value="M">Macho</option>
                <option value="F">Hembra</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="pet-birth" value="Fecha de nacimiento" className="mb-1 block" />
              <TextInput
                id="pet-birth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="pet-weight" value="Peso actual (kg)" className="mb-1 block" />
              <TextInput
                id="pet-weight"
                type="number"
                step="0.01"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="pet-color" value="Color" className="mb-1 block" />
              <TextInput
                id="pet-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="pet-status" value="Estado del paciente" className="mb-1 block" />
              <Select
                id="pet-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'deceased')}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="deceased">Fallecido</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Checkbox
              id="pet-neutered"
              checked={neutered}
              onChange={(e) => setNeutered(e.target.checked)}
            />
            <Label htmlFor="pet-neutered">Esterilizado / Castrado</Label>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-3">
            👤 Datos del Propietario
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="owner-name" value="Nombre *" className="mb-1 block" />
              <TextInput
                id="owner-name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="owner-phone" value="Teléfono *" className="mb-1 block" />
              <TextInput
                id="owner-phone"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="owner-email" value="Correo electrónico" className="mb-1 block" />
              <TextInput
                id="owner-email"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="owner-address" value="Dirección" className="mb-1 block" />
              <TextInput
                id="owner-address"
                value={ownerAddress}
                onChange={(e) => setOwnerAddress(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-3">
            🩺 Antecedentes Médicos
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="allergies" value="Alergias conocidas" className="mb-1 block" />
              <TextInput
                id="allergies"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="chronic" value="Condiciones crónicas" className="mb-1 block" />
              <TextInput
                id="chronic"
                value={chronicText}
                onChange={(e) => setChronicText(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="notes" value="Observaciones o notas" className="mb-1 block" />
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/pets/${petId}`}>
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
                <Spinner size="sm" className="mr-2" /> Guardando cambios...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
