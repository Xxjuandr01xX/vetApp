import { Pet } from '@/lib/types/pet';
import { Appointment } from '@/lib/types/appointment';
import { Treatment } from '@/lib/types/treatment';

/**
 * Escapa comillas y caracteres especiales para campos CSV
 */
function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Convierte un array de objetos en formato CSV con cabeceras
 */
export function convertToCsv(headers: { key: string; label: string }[], data: Record<string, any>[]): string {
  const headerRow = headers.map((h) => escapeCsvValue(h.label)).join(',');
  const rows = data.map((item) =>
    headers.map((h) => escapeCsvValue(item[h.key] ?? '')).join(',')
  );
  return [headerRow, ...rows].join('\r\n');
}

/**
 * Exporta pacientes a formato CSV
 */
export function exportPetsToCsv(pets: Pet[]): string {
  const headers = [
    { key: 'name', label: 'Nombre Mascota' },
    { key: 'species', label: 'Especie' },
    { key: 'breed', label: 'Raza' },
    { key: 'sex', label: 'Sexo' },
    { key: 'neutered', label: 'Esterilizado' },
    { key: 'weightKg', label: 'Peso (kg)' },
    { key: 'status', label: 'Estado' },
    { key: 'ownerName', label: 'Tutor / Dueño' },
    { key: 'ownerPhone', label: 'Teléfono Tutor' },
    { key: 'ownerEmail', label: 'Email Tutor' },
    { key: 'ownerAddress', label: 'Dirección Tutor' },
    { key: 'allergies', label: 'Alergias' },
    { key: 'chronicConditions', label: 'Condiciones Crónicas' },
    { key: 'notes', label: 'Notas Clínicas' },
  ];

  const rows = pets.map((p) => ({
    name: p.name,
    species: p.species,
    breed: p.breed || '',
    sex: p.sex === 'M' ? 'Macho' : 'Hembra',
    neutered: p.neutered ? 'Sí' : 'No',
    weightKg: p.weightKg ?? '',
    status: p.status === 'active' ? 'Activo' : p.status === 'inactive' ? 'Inactivo' : 'Fallecido',
    ownerName: p.owner?.name || '',
    ownerPhone: p.owner?.phone || '',
    ownerEmail: p.owner?.email || '',
    ownerAddress: p.owner?.address || '',
    allergies: (p.allergies || []).join('; '),
    chronicConditions: (p.chronicConditions || []).join('; '),
    notes: p.notes || '',
  }));

  return convertToCsv(headers, rows);
}

/**
 * Exporta citas a formato CSV
 */
export function exportAppointmentsToCsv(appointments: Appointment[]): string {
  const headers = [
    { key: 'date', label: 'Fecha y Hora' },
    { key: 'petName', label: 'Paciente' },
    { key: 'petSpecies', label: 'Especie' },
    { key: 'ownerName', label: 'Tutor' },
    { key: 'ownerPhone', label: 'Teléfono' },
    { key: 'reason', label: 'Motivo de Consulta' },
    { key: 'durationMin', label: 'Duración (min)' },
    { key: 'status', label: 'Estado' },
    { key: 'amountUSD', label: 'Honorarios (USD)' },
    { key: 'amountVES', label: 'Honorarios (VES)' },
    { key: 'rateUsed', label: 'Tasa BCV' },
    { key: 'notes', label: 'Observaciones' },
  ];

  const rows = appointments.map((a) => {
    let dateStr = '';
    if (a.date) {
      const d = a.date instanceof Date ? a.date : (a.date as any)?.toDate ? (a.date as any).toDate() : new Date(a.date as any);
      dateStr = d.toISOString();
    }

    return {
      date: dateStr,
      petName: a.petName || '',
      petSpecies: a.petSpecies || '',
      ownerName: a.ownerName || '',
      ownerPhone: a.ownerPhone || '',
      reason: a.reason || '',
      durationMin: a.durationMin ?? 30,
      status:
        a.status === 'completed'
          ? 'Completada'
          : a.status === 'cancelled'
          ? 'Cancelada'
          : a.status === 'no_show'
          ? 'No Asistió'
          : 'Programada',
      amountUSD: a.servicePrice?.amountUSD ?? '',
      amountVES: a.servicePrice?.amountVES ?? '',
      rateUsed: a.servicePrice?.rateUsed ?? '',
      notes: a.notes || '',
    };
  });

  return convertToCsv(headers, rows);
}

/**
 * Exporta tratamientos a formato CSV
 */
export function exportTreatmentsToCsv(treatments: Treatment[]): string {
  const headers = [
    { key: 'date', label: 'Fecha' },
    { key: 'petName', label: 'Paciente' },
    { key: 'diagnosis', label: 'Diagnóstico' },
    { key: 'weightAtVisit', label: 'Peso en Consulta (kg)' },
    { key: 'medications', label: 'Medicamentos Prescritos' },
    { key: 'procedures', label: 'Procedimientos' },
    { key: 'recommendations', label: 'Recomendaciones' },
    { key: 'amountUSD', label: 'Honorarios (USD)' },
    { key: 'amountVES', label: 'Honorarios (VES)' },
    { key: 'rateUsed', label: 'Tasa BCV' },
  ];

  const rows = treatments.map((t) => {
    let dateStr = '';
    if (t.createdAt) {
      const d = t.createdAt instanceof Date ? t.createdAt : (t.createdAt as any)?.toDate ? (t.createdAt as any).toDate() : new Date(t.createdAt as any);
      dateStr = d.toISOString();
    }

    const medSummary = (t.medications || [])
      .map(
        (m) =>
          `${m.commercialName || m.activeIngredient} (${m.dose}, ${m.frequency} x ${m.durationDays}d)`
      )
      .join(' | ');

    return {
      date: dateStr,
      petName: t.petName || '',
      diagnosis: t.diagnosis || '',
      weightAtVisit: t.weightAtVisit ?? '',
      medications: medSummary,
      procedures: (t.procedures || []).join('; '),
      recommendations: t.recommendations || '',
      amountUSD: t.servicePrice?.amountUSD ?? '',
      amountVES: t.servicePrice?.amountVES ?? '',
      rateUsed: t.servicePrice?.rateUsed ?? '',
    };
  });

  return convertToCsv(headers, rows);
}

/**
 * Dispara la descarga de un archivo de texto/csv en el navegador
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;'): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // BOM UTF-8 para Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
