'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button, TextInput, Spinner, Card, Badge } from 'flowbite-react';
import { HiPlus, HiSearch, HiOutlineChevronRight, HiDownload } from 'react-icons/hi';
import { useAuth } from '@/lib/hooks/useAuth';
import { getTreatments } from '@/lib/services/treatments';
import { Treatment } from '@/lib/types/treatment';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { exportTreatmentsToCsv, triggerFileDownload } from '@/lib/utils/export-csv';

export default function TreatmentsPage() {
  const { user } = useAuth();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadTreatments() {
      if (!user) return;
      try {
        const data = await getTreatments(user.uid);
        setTreatments(data);
      } catch (err) {
        console.error('Error cargando tratamientos:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTreatments();
  }, [user]);

  const filteredTreatments = useMemo(() => {
    return treatments.filter((trt) => {
      const matchSearch =
        trt.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trt.petName && trt.petName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        trt.medications.some((m) =>
          m.commercialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.activeIngredient.toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchSearch;
    });
  }, [treatments, searchTerm]);

  const formatTrtDate = (dateVal: any) => {
    if (!dateVal) return '';
    const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
    return format(d, "d 'de' MMMM, yyyy", { locale: es });
  };

  const handleExportCsv = () => {
    if (treatments.length === 0) return;
    const csvContent = exportTreatmentsToCsv(
      filteredTreatments.length > 0 ? filteredTreatments : treatments
    );
    const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
    triggerFileDownload(csvContent, `Tratamientos_VetSaaS_${dateStr}.csv`);
  };

  return (
    <div className="pb-24 sm:pb-8 max-w-5xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tratamientos Clínicos</h1>
          <p className="text-sm text-gray-500">Histórico de prescripciones y consultas realizadas</p>
        </div>

        <div className="flex items-center gap-2">
          {treatments.length > 0 && (
            <Button
              color="light"
              size="sm"
              onClick={handleExportCsv}
              title="Exportar tratamientos a CSV / Excel"
              className="flex items-center"
            >
              <HiDownload className="mr-1.5 h-4 w-4 text-emerald-600" /> Exportar CSV
            </Button>
          )}

          <Link href="/treatments/new">
            <Button className="w-full sm:w-auto bg-vet-primary hover:bg-vet-primary/90">
              <HiPlus className="mr-2 h-4 w-4" /> Nuevo Tratamiento
            </Button>
          </Link>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-6 flex gap-2">
        <TextInput
          className="flex-1"
          icon={HiSearch}
          placeholder="Buscar por diagnóstico, paciente o medicamento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <Button color="light" size="sm" onClick={() => setSearchTerm('')}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Listado */}
      {loading ? (
        <div className="text-center py-16">
          <Spinner size="xl" color="info" />
          <p className="mt-3 text-sm text-gray-500">Cargando tratamientos...</p>
        </div>
      ) : filteredTreatments.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-4xl mb-3">💊</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {treatments.length === 0 ? 'No hay tratamientos registrados' : 'No se encontraron resultados'}
          </h3>
          <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
            {treatments.length === 0
              ? 'Empieza registrando un diagnóstico y receta médica para tus pacientes.'
              : 'Prueba buscando con otro término o borra el filtro.'}
          </p>
          {treatments.length === 0 && (
            <Link href="/treatments/new" className="inline-block mx-auto">
              <Button className="bg-vet-primary hover:bg-vet-primary/90">
                <HiPlus className="mr-1.5 h-4 w-4" /> Registrar primer tratamiento
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTreatments.map((trt) => (
            <Link key={trt.id} href={`/pets/${trt.petId}`}>
              <div className="card-vet p-4 hover:border-vet-primary-light transition-all flex items-center justify-between cursor-pointer">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900 text-base">{trt.diagnosis}</span>
                    <Badge color="info">🐾 {trt.petName || 'Paciente'}</Badge>
                    {trt.weightAtVisit && (
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        {trt.weightAtVisit} kg
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mb-1.5">
                    {formatTrtDate(trt.createdAt)}
                  </p>

                  {trt.medications.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {trt.medications.map((m, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded font-medium border border-blue-100"
                        >
                          💊 {m.commercialName} ({m.dose})
                        </span>
                      ))}
                    </div>
                  )}

                  {trt.procedures.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {trt.procedures.map((proc, idx) => (
                        <span
                          key={idx}
                          className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded font-medium border border-emerald-100"
                        >
                          🩺 {proc}
                        </span>
                      ))}
                    </div>
                  )}
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
