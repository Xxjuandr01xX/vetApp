import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Pet } from '@/lib/types/pet';
import { HistoryEvent } from '@/lib/types/treatment';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
    letterSpacing: 0.5,
  },
  clinicSubtitle: {
    fontSize: 8.5,
    color: '#6b7280',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#1E3A5F',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#1E3A5F',
    backgroundColor: '#f3f4f6',
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 6,
  },
  gridTwoCols: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 2.5,
  },
  fieldLabel: {
    fontWeight: 'bold',
    color: '#4b5563',
    width: 95,
  },
  fieldValue: {
    color: '#111827',
    flex: 1,
  },
  eventBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventTitle: {
    fontWeight: 'bold',
    fontSize: 9.5,
    color: '#1E3A5F',
  },
  eventDate: {
    fontSize: 8,
    color: '#6b7280',
  },
  eventDetails: {
    fontSize: 8.5,
    color: '#4b5563',
    marginTop: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signatureLine: {
    width: 160,
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
    textAlign: 'center',
    paddingTop: 3,
    fontSize: 8.5,
    color: '#4b5563',
  },
  footerNote: {
    fontSize: 7.5,
    color: '#9ca3af',
  },
});

export interface ClinicalHistoryPdfDocumentProps {
  pet: Pet;
  events: HistoryEvent[];
  vetName?: string;
}

export const ClinicalHistoryPdfDocument: React.FC<ClinicalHistoryPdfDocumentProps> = ({
  pet,
  events,
  vetName = 'Médico Veterinario',
}) => {
  const generationDate = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.clinicName}>🐾 VetApp</Text>
            <Text style={styles.clinicSubtitle}>Expediente Clínico Veterinario Oficial</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>HISTORIAL CLÍNICO</Text>
          </View>
        </View>

        {/* Datos del Paciente y Tutor */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ficha del Paciente</Text>
          <View style={styles.gridTwoCols}>
            <View style={styles.col}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Paciente:</Text>
                <Text style={styles.fieldValue}>{pet.name}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Especie / Raza:</Text>
                <Text style={styles.fieldValue}>
                  {pet.species} {pet.breed ? `(${pet.breed})` : ''}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Sexo / Estado:</Text>
                <Text style={styles.fieldValue}>
                  {pet.sex === 'M' ? 'Macho' : 'Hembra'} • {pet.neutered ? 'Castrado' : 'Entero'}
                </Text>
              </View>
              {pet.weightKg && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Peso habitual:</Text>
                  <Text style={styles.fieldValue}>{pet.weightKg} kg</Text>
                </View>
              )}
            </View>

            <View style={styles.col}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Tutor:</Text>
                <Text style={styles.fieldValue}>{pet.owner.name}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Teléfono:</Text>
                <Text style={styles.fieldValue}>{pet.owner.phone}</Text>
              </View>
              {pet.owner.email && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Email:</Text>
                  <Text style={styles.fieldValue}>{pet.owner.email}</Text>
                </View>
              )}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Fecha de emisión:</Text>
                <Text style={styles.fieldValue}>{generationDate}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Alertas clínicas */}
        {((pet.allergies && pet.allergies.length > 0) || (pet.chronicConditions && pet.chronicConditions.length > 0)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alertas Médicas y Antecedentes</Text>
            {pet.allergies && pet.allergies.length > 0 && (
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: '#b91c1c' }]}>Alergias:</Text>
                <Text style={styles.fieldValue}>{pet.allergies.join(', ')}</Text>
              </View>
            )}
            {pet.chronicConditions && pet.chronicConditions.length > 0 && (
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: '#b45309' }]}>Condiciones:</Text>
                <Text style={styles.fieldValue}>{pet.chronicConditions.join(', ')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Cronología de Eventos Clínicos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cronología de Eventos Clínicos ({events.length})</Text>
          {events.length === 0 ? (
            <Text style={{ fontSize: 9, color: '#6b7280', fontStyle: 'italic', padding: 8 }}>
              No hay eventos clínicos registrados en este expediente.
            </Text>
          ) : (
            events.slice(0, 15).map((evt, idx) => {
              const d =
                evt.date instanceof Date
                  ? evt.date
                  : (evt.date as any)?.toDate
                  ? (evt.date as any).toDate()
                  : new Date(evt.date as any);

              const dateFormatted = format(d, "d 'de' MMMM, yyyy - hh:mm a", { locale: es });

              return (
                <View key={idx} style={styles.eventBox}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>
                      [{evt.type.toUpperCase()}] {evt.summary}
                    </Text>
                    <Text style={styles.eventDate}>{dateFormatted}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Pie de Página con Firma */}
        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            VetApp • Documento de validez clínica veterinaria
          </Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.signatureLine}>Firma y Sello del Médico Veterinario</Text>
            <Text style={{ fontSize: 8.5, fontWeight: 'bold', marginTop: 2, color: '#1E3A5F' }}>
              {vetName}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
