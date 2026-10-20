'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button, TextInput, Select, Badge, Spinner, Card } from 'flowbite-react';
import { HiPlus, HiSearch, HiOutlineChevronRight, HiDownload } from 'react-icons/hi';
import { useAuth } from '@/lib/hooks/useAuth';
import { getPets } from '@/lib/services/pets';
import { Pet, Species } from '@/lib/types/pet';
import { SpeciesIcon, SpeciesBadge } from '@/components/domain/SpeciesIcon';
import { PatientLimitAlert } from '@/components/domain/PatientLimitAlert';
import { SPECIES } from '@/lib/constants';
import { exportPetsToCsv, triggerFileDownload } from '@/lib/utils/export-csv';
import { format } from 'date-fns';

export default function PetsPage() {
  const { user, isPremium } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');

  useEffect(() => {
    async function loadPets() {
      if (!user) return;
      try {
        const data = await getPets(user.uid);
        setPets(data);
      } catch (err) {
        console.error('Error cargando pacientes:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPets();
  }, [user]);

  // Filtrado reactivo en memoria (optimizado para plan Spark)
  const filteredPets = useMemo(() => {
    return pets.filter((pet) => {
      const matchSearch =
        pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pet.breed && pet.breed.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchSpecies =
        selectedSpecies === 'all' || pet.species === selectedSpecies;

      const matchStatus =
        selectedStatus === 'all' || pet.status === selectedStatus;

      return matchSearch && matchSpecies && matchStatus;
    });
  }, [pets, searchTerm, selectedSpecies, selectedStatus]);

  const handleExportCsv = () => {
    if (pets.length === 0) return;
    const csvContent = exportPetsToCsv(filteredPets.length > 0 ? filteredPets : pets);
    const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
    triggerFileDownload(csvContent, `Pacientes_VetSaaS_${dateStr}.csv`);
  };

  return (
    <div className="pb-24 sm:pb-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pacientes</h1>
          <p className="text-sm text-gray-500">Gestión de fichas clínicas y expedientes</p>
        </div>

        <div className="flex items-center gap-2">
          {pets.length > 0 && (
            <Button
              color="light"
              size="sm"
              onClick={handleExportCsv}
              title="Exportar pacientes filtrados a Excel / CSV"
              className="flex items-center"
            >
              <HiDownload className="mr-1.5 h-4 w-4 text-emerald-600" /> Exportar CSV
            </Button>
          )}

          <Link href="/pets/new">
            <Button className="w-full sm:w-auto bg-vet-primary hover:bg-vet-primary/90">
              <HiPlus className="mr-2 h-4 w-4" /> Nuevo Paciente
            </Button>
          </Link>
        </div>
      </div>

      {/* Alerta de límite de pacientes */}
      <PatientLimitAlert currentCount={pets.length} isPremium={isPremium} />

      {/* Filtros de búsqueda */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <div className="sm:col-span-2">
          <TextInput
            icon={HiSearch}
            placeholder="Buscar por mascota, dueño o raza..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <Select
            value={selectedSpecies}
            onChange={(e) => setSelectedSpecies(e.target.value)}
          >
            <option value="all">Todas las especies</option>
            {SPECIES.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex gap-2">
          <Select
            className="flex-1"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="deceased">Fallecidos</option>
          </Select>

          {(searchTerm || selectedSpecies !== 'all' || selectedStatus !== 'active') && (
            <Button
              color="light"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedSpecies('all');
                setSelectedStatus('all');
              }}
              title="Limpiar todos los filtros"
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      {loading ? (
        <div className="text-center py-12">
          <Spinner size="xl" color="info" />
          <p className="mt-3 text-sm text-gray-500">Cargando pacientes...</p>
        </div>
      ) : filteredPets.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">🐾</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {pets.length === 0 ? 'No tienes pacientes registrados' : 'No se encontraron resultados'}
          </h3>
          <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
            {pets.length === 0
              ? 'Empieza registrando tu primer paciente para llevar su historial médico y tratamientos.'
              : 'Prueba cambiando los filtros de búsqueda o especie.'}
          </p>
          {pets.length === 0 && (
            <Link href="/pets/new" className="inline-block mx-auto">
              <Button className="bg-vet-accent hover:bg-vet-accent/90">
                Registrar primer paciente
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPets.map((pet) => (
            <Link key={pet.id} href={`/pets/${pet.id}`}>
              <div className="card-vet hover:border-vet-primary-light transition-all cursor-pointer p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SpeciesIcon species={pet.species as Species} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{pet.name}</h3>
                      <span className="text-xs text-gray-400">
                        ({pet.sex === 'M' ? 'Macho' : 'Hembra'})
                      </span>
                    </div>

                    <p className="text-xs text-gray-500">
                      {pet.breed || pet.species} • Dueño: {pet.owner.name}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5">
                      <SpeciesBadge species={pet.species as Species} />
                      {pet.weightKg && (
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          {pet.weightKg} kg
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-gray-400">
                  <HiOutlineChevronRight className="w-5 h-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
