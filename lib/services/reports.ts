import { Pet } from '@/lib/types/pet';
import { Appointment } from '@/lib/types/appointment';
import { Treatment } from '@/lib/types/treatment';

export interface ReportsSummary {
  totalPets: number;
  activePets: number;
  speciesDistribution: { species: string; count: number; percentage: number }[];
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  scheduledAppointments: number;
  completionRate: number;
  totalTreatments: number;
  totalIncomeUSD: number;
  totalIncomeVES: number;
  averageIncomePerTreatmentUSD: number;
  topDiagnoses: { diagnosis: string; count: number }[];
  topMedications: { name: string; count: number }[];
}

/**
 * Calcula métricas clínicas y financieras a partir de los datos en memoria/caché
 */
export function calculateReportsSummary(
  pets: Pet[],
  appointments: Appointment[],
  treatments: Treatment[]
): ReportsSummary {
  const totalPets = pets.length;
  const activePets = pets.filter((p) => p.status === 'active').length;

  // Distribución por especies
  const speciesMap: Record<string, number> = {};
  pets.forEach((p) => {
    const sp = p.species || 'Otro';
    speciesMap[sp] = (speciesMap[sp] || 0) + 1;
  });

  const speciesDistribution = Object.entries(speciesMap)
    .map(([species, count]) => ({
      species,
      count,
      percentage: totalPets > 0 ? Math.round((count / totalPets) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Citas y métricas de asistencia
  const totalAppointments = appointments.length;
  let completedAppointments = 0;
  let cancelledAppointments = 0;
  let noShowAppointments = 0;
  let scheduledAppointments = 0;

  appointments.forEach((a) => {
    if (a.status === 'completed') completedAppointments++;
    else if (a.status === 'cancelled') cancelledAppointments++;
    else if (a.status === 'no_show') noShowAppointments++;
    else scheduledAppointments++;
  });

  const completionRate =
    totalAppointments > 0
      ? Math.round((completedAppointments / totalAppointments) * 100)
      : 0;

  // Tratamientos, honorarios e ingresos
  const totalTreatments = treatments.length;
  let totalIncomeUSD = 0;
  let totalIncomeVES = 0;
  let pricedTreatmentsCount = 0;

  // Diagnósticos y medicamentos más prescritos
  const diagnosesMap: Record<string, number> = {};
  const medicationsMap: Record<string, number> = {};

  treatments.forEach((t) => {
    if (t.servicePrice) {
      totalIncomeUSD += t.servicePrice.amountUSD || 0;
      totalIncomeVES += t.servicePrice.amountVES || 0;
      pricedTreatmentsCount++;
    }

    if (t.diagnosis) {
      const cleanDiag = t.diagnosis.trim();
      diagnosesMap[cleanDiag] = (diagnosesMap[cleanDiag] || 0) + 1;
    }

    (t.medications || []).forEach((m) => {
      const medName = m.commercialName || m.activeIngredient;
      if (medName) {
        const cleanName = medName.trim();
        medicationsMap[cleanName] = (medicationsMap[cleanName] || 0) + 1;
      }
    });
  });

  // Sumar también honorarios de citas si están fijados en citas
  appointments.forEach((a) => {
    if (a.servicePrice && a.status === 'completed') {
      totalIncomeUSD += a.servicePrice.amountUSD || 0;
      totalIncomeVES += a.servicePrice.amountVES || 0;
    }
  });

  totalIncomeUSD = Math.round(totalIncomeUSD * 100) / 100;
  totalIncomeVES = Math.round(totalIncomeVES * 100) / 100;

  const averageIncomePerTreatmentUSD =
    pricedTreatmentsCount > 0
      ? Math.round((totalIncomeUSD / pricedTreatmentsCount) * 100) / 100
      : 0;

  const topDiagnoses = Object.entries(diagnosesMap)
    .map(([diagnosis, count]) => ({ diagnosis, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topMedications = Object.entries(medicationsMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalPets,
    activePets,
    speciesDistribution,
    totalAppointments,
    completedAppointments,
    cancelledAppointments,
    noShowAppointments,
    scheduledAppointments,
    completionRate,
    totalTreatments,
    totalIncomeUSD,
    totalIncomeVES,
    averageIncomePerTreatmentUSD,
    topDiagnoses,
    topMedications,
  };
}
