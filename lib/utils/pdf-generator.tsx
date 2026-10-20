import React from 'react';
import { Treatment, HistoryEvent } from '@/lib/types/treatment';
import { Appointment } from '@/lib/types/appointment';
import { Pet } from '@/lib/types/pet';

/**
 * Genera el Blob PDF de un Récipe / Tratamiento cargando @react-pdf/renderer bajo demanda (lazy)
 * para reducir en ~430 kB el First Load JS de las páginas del dashboard.
 */
export async function generateTreatmentPdfBlob(
  treatment: Treatment,
  pet: Pet,
  vetName: string
): Promise<Blob> {
  const [{ pdf }, { TreatmentPdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/domain/TreatmentPdfDocument'),
  ]);

  const doc = <TreatmentPdfDocument treatment={treatment} pet={pet} vetName={vetName} />;
  return await pdf(doc).toBlob();
}

/**
 * Genera el Blob PDF de un Comprobante de Cita cargando @react-pdf/renderer bajo demanda (lazy).
 */
export async function generateAppointmentPdfBlob(
  appointment: Appointment,
  pet: Pet,
  vetName: string
): Promise<Blob> {
  const [{ pdf }, { AppointmentPdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/domain/AppointmentPdfDocument'),
  ]);

  const doc = <AppointmentPdfDocument appointment={appointment} pet={pet} vetName={vetName} />;
  return await pdf(doc).toBlob();
}

/**
 * Genera el Blob PDF del Historial Clínico Completo cargando @react-pdf/renderer bajo demanda (lazy).
 */
export async function generateClinicalHistoryPdfBlob(
  pet: Pet,
  events: HistoryEvent[],
  vetName: string
): Promise<Blob> {
  const [{ pdf }, { ClinicalHistoryPdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/domain/ClinicalHistoryPdfDocument'),
  ]);

  const doc = <ClinicalHistoryPdfDocument pet={pet} events={events} vetName={vetName} />;
  return await pdf(doc).toBlob();
}
