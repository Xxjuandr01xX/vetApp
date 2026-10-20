import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Appointment } from '@/lib/types/appointment';
import { Pet } from '@/lib/types/pet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatVES } from '@/lib/utils/currency';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#1E3A5F',
    paddingBottom: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleBlock: {
    flexDirection: 'column',
  },
  clinicName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  clinicSubtitle: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  docBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'flex-end',
  },
  docBadgeTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  docBadgeDate: {
    fontSize: 8.5,
    color: '#3b82f6',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 10,
  },
  infoCardTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#4b5563',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: 65,
    fontSize: 8.5,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    color: '#111827',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E3A5F',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    marginBottom: 6,
  },
  detailsBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 10,
  },
  reasonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  notesText: {
    fontSize: 9,
    color: '#4b5563',
    marginTop: 4,
    lineHeight: 1.4,
  },
  pricingBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 6,
    padding: 10,
  },
  pricingTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 4,
  },
  pricingAmount: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#14532d',
  },
  pricingRate: {
    fontSize: 8.5,
    color: '#15803d',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signatureLine: {
    width: 170,
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
    textAlign: 'center',
    paddingTop: 4,
    fontSize: 9,
    color: '#4b5563',
  },
  footerNote: {
    fontSize: 8,
    color: '#9ca3af',
  },
});

export interface AppointmentPdfDocumentProps {
  appointment: Appointment;
  pet?: Pet | null;
  vetName?: string;
}

export const AppointmentPdfDocument: React.FC<AppointmentPdfDocumentProps> = ({
  appointment,
  pet,
  vetName = 'Médico Veterinario Tratante',
}) => {
  const appointmentDate = appointment.date instanceof Date
    ? appointment.date
    : (appointment.date as any)?.toDate
    ? (appointment.date as any).toDate()
    : new Date(appointment.date as any);

  const formattedDate = format(appointmentDate, "EEEE d 'de' MMMM, yyyy", { locale: es });
  const formattedTime = format(appointmentDate, 'hh:mm a', { locale: es });

  const statusLabel =
    appointment.status === 'completed'
      ? 'Completada / Atendida'
      : appointment.status === 'cancelled'
      ? 'Cancelada'
      : appointment.status === 'no_show'
      ? 'No asistió'
      : 'Programada / Confirmada';

  return (
    <Document title={`Cita-${appointment.petName || 'Paciente'}-${format(appointmentDate, 'yyyyMMdd')}`}>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.clinicName}>🐾 VetApp</Text>
            <Text style={styles.clinicSubtitle}>
              Atención Médica Veterinaria y Control Clínico
            </Text>
          </View>
          <View style={styles.docBadge}>
            <Text style={styles.docBadgeTitle}>COMPROBANTE DE CITA</Text>
            <Text style={styles.docBadgeDate}>
              Emisión: {format(new Date(), "dd/MM/yyyy HH:mm")}
            </Text>
          </View>
        </View>

        {/* Tarjetas de Información: Paciente y Cita */}
        <View style={styles.infoGrid}>
          {/* Datos del Paciente y Tutor */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Datos del Paciente & Tutor</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Paciente:</Text>
              <Text style={styles.infoValue}>
                {appointment.petName || pet?.name || 'N/A'} ({appointment.petSpecies || pet?.species || 'N/A'})
              </Text>
            </View>
            {pet?.breed && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Raza:</Text>
                <Text style={styles.infoValue}>{pet.breed}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tutor:</Text>
              <Text style={styles.infoValue}>
                {appointment.ownerName || pet?.owner.name || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono:</Text>
              <Text style={styles.infoValue}>
                {appointment.ownerPhone || pet?.owner.phone || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Datos de la Cita */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Detalles de la Agenda</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha:</Text>
              <Text style={styles.infoValue}>{formattedDate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hora:</Text>
              <Text style={styles.infoValue}>{formattedTime}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duración:</Text>
              <Text style={styles.infoValue}>{appointment.durationMin} minutos</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado:</Text>
              <Text style={[styles.infoValue, { fontWeight: 'bold' }]}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        {/* Motivo y Observaciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motivo de Consulta y Observaciones</Text>
          <View style={styles.detailsBox}>
            <Text style={styles.reasonText}>Motivo: {appointment.reason}</Text>
            {appointment.notes && (
              <Text style={styles.notesText}>
                Observaciones: {appointment.notes}
              </Text>
            )}
          </View>
        </View>

        {/* Honorarios de la Consulta (si fue asignado) */}
        {appointment.servicePrice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Honorarios y Presupuesto de la Cita</Text>
            <View style={styles.pricingBox}>
              <Text style={styles.pricingTitle}>Monto Acordado:</Text>
              <Text style={styles.pricingAmount}>
                ${appointment.servicePrice.amountUSD.toFixed(2)} USD ({formatVES(appointment.servicePrice.amountVES)})
              </Text>
              <Text style={styles.pricingRate}>
                Tasa aplicada: {appointment.servicePrice.rateSource} = {formatVES(appointment.servicePrice.rateUsed)} ({appointment.servicePrice.rateDate})
              </Text>
            </View>
          </View>
        )}

        {/* Pie de Página con Firma */}
        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            Generado por VetApp • Comprobante oficial de cita médica veterinaria
          </Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.signatureLine}>Firma y Sello del Médico Veterinario</Text>
            <Text style={{ fontSize: 9, fontWeight: 'bold', marginTop: 2, color: '#1E3A5F' }}>
              {vetName}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
