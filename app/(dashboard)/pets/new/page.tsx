'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useAuth } from '@/lib/hooks/useAuth';
import { createPet } from '@/lib/services/pets';
import { SPECIES } from '@/lib/constants';
import { Species } from '@/lib/types/pet';

export default function NewPetPage() {
  const router = useRouter();
  const { user, isPremium } = useAuth();

  const [loading, setLoading] = useState(false);
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

  // Campos del propietario
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      setError('El nombre de la mascota es obligatorio');
      return;
    }
    if (!ownerName.trim()) {
      setError('El nombre del dueño es obligatorio');
      return;
    }
    if (!ownerPhone.trim()) {
      setError('El teléfono del dueño es obligatorio');
      return;
    }

    setLoading(true);
    setError('');

    const allergies = allergiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const chronicConditions = chronicText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const petData = {
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
      status: 'active' as const,
    };

    const res = await createPet(user.uid, petData, !isPremium);

    setLoading(false);

    if (res.success && res.petId) {
      router.push(`/pets/${res.petId}`);
    } else {
      setError(res.error || 'Error al guardar el paciente');
    }
  };

  return (
    <div className="pb-24 sm:pb-8 max-w-3xl mx-auto">
      {/* Botón Volver */}
      <div className="mb-4">
        <Link
          href="/pets"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <HiArrowLeft className="mr-1.5 h-4 w-4" /> Volver a pacientes
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Registrar Nuevo Paciente</h1>
        <p className="text-sm text-gray-500">
          Crea la ficha médica del paciente con datos del animal y de su tutor.
        </p>
      </div>

      {error && (
        <Alert color="failure" icon={HiExclamationCircle} className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección: Datos del Paciente */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-3">
            🐾 Datos de la Mascota
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pet-name" value="Nombre *" className="mb-1 block" />
              <TextInput
                id="pet-name"
                placeholder="Ej. Firulais, Michi..."
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
                placeholder="Ej. Mestizo, Golden Retriever..."
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
              <Label htmlFor="pet-birth" value="Fecha de nacimiento aproximada" className="mb-1 block" />
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
                placeholder="Ej. 12.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="pet-color" value="Color / Manto" className="mb-1 block" />
              <TextInput
                id="pet-color"
                placeholder="Ej. Negro con blanco, atigrado..."
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="pet-microchip" value="Nº Microchip (opcional)" className="mb-1 block" />
              <TextInput
                id="pet-microchip"
                placeholder="Ej. 981098123456789"
                value={microchip}
                onChange={(e) => setMicrochip(e.target.value)}
              />
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

        {/* Sección: Datos del Propietario / Tutor */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-3">
            👤 Datos del Propietario
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="owner-name" value="Nombre completo *" className="mb-1 block" />
              <TextInput
                id="owner-name"
                placeholder="Ej. Carlos Mendoza"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="owner-phone" value="Teléfono de contacto *" className="mb-1 block" />
              <TextInput
                id="owner-phone"
                placeholder="Ej. 0414-1234567"
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
                placeholder="Ej. carlos@gmail.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="owner-address" value="Dirección o zona" className="mb-1 block" />
              <TextInput
                id="owner-address"
                placeholder="Ej. Urb. Las Mercedes, Caracas"
                value={ownerAddress}
                onChange={(e) => setOwnerAddress(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Sección: Antecedentes Clínicos */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-3">
            🩺 Antecedentes Médicos
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="allergies" value="Alergias conocidas (separadas por comas)" className="mb-1 block" />
              <TextInput
                id="allergies"
                placeholder="Ej. Penicilina, picadura de pulgas, pollo..."
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="chronic" value="Condiciones crónicas (separadas por comas)" className="mb-1 block" />
              <TextInput
                id="chronic"
                placeholder="Ej. Insuficiencia renal, cardiopatía, artrosis..."
                value={chronicText}
                onChange={(e) => setChronicText(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="notes" value="Observaciones o notas generales" className="mb-1 block" />
              <Textarea
                id="notes"
                rows={3}
                placeholder="Comportamiento, señas particulares, historial de rescate..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 pt-2">
          <Link href="/pets">
            <Button color="gray" disabled={loading}>
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-vet-primary hover:bg-vet-primary/90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="mr-2" /> Guardando...
              </>
            ) : (
              'Guardar Paciente'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
