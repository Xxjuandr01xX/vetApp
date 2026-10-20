import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Treatment } from '@/lib/types/treatment';
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
    letterSpacing: 0.5,
  },
  clinicSubtitle: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  recipeBadge: {
    backgroundColor: '#1E3A5F',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  recipeBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E3A5F',
    backgroundColor: '#f3f4f6',
    paddingVertical: 4,
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
    marginBottom: 3,
  },
  fieldLabel: {
    fontWeight: 'bold',
    color: '#4b5563',
    width: 90,
  },
  fieldValue: {
    color: '#111827',
    flex: 1,
  },
  medicationBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 3,
  },
  medName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  medActive: {
    fontSize: 9,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  medDetail: {
    fontSize: 9.5,
    color: '#374151',
    marginTop: 2,
  },
  medNotes: {
    fontSize: 8.5,
    color: '#4b5563',
    marginTop: 3,
    fontStyle: 'italic',
  },
  recommendationsText: {
    fontSize: 9.5,
    lineHeight: 1.4,
    color: '#374151',
    padding: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
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

export interface TreatmentPdfDocumentProps {
  treatment: Treatment;
  pet: Pet;
  vetName?: string;
}

export const TreatmentPdfDocument: React.FC<TreatmentPdfDocumentProps> = ({
  treatment,
  pet,
  vetName = 'Médico Veterinario',
}) => {
  const dateFormatted = treatment.createdAt
    ? format(
        treatment.createdAt instanceof Date
          ? treatment.createdAt
          : (treatment.createdAt as any)?.toDate
          ? (treatment.createdAt as any).toDate()
          : new Date(treatment.createdAt as any),
        "d 'de' MMMM, yyyy",
        { locale: es }
      )
    : format(new Date(), "d 'de' MMMM, yyyy", { locale: es });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.clinicName}>🐾 VetApp</Text>
            <Text style={styles.clinicSubtitle}>Gestión y Atención Médico Veterinaria</Text>
          </View>
          <View style={styles.recipeBadge}>
            <Text style={styles.recipeBadgeText}>RÉCIPE MÉDICO VETERINARIO</Text>
          </View>
        </View>

        {/* Datos del Paciente y Tutor */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Paciente y Propietario</Text>
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
                <Text style={styles.fieldLabel}>Sexo / Esterilizado:</Text>
                <Text style={styles.fieldValue}>
                  {pet.sex === 'M' ? 'Macho' : 'Hembra'} {pet.neutered ? '• Castrado(a)' : ''}
                </Text>
              </View>
              {treatment.weightAtVisit && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Peso en consulta:</Text>
                  <Text style={styles.fieldValue}>{treatment.weightAtVisit} kg</Text>
                </View>
              )}
            </View>

            <View style={styles.col}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Tutor / Dueño:</Text>
                <Text style={styles.fieldValue}>{pet.owner.name}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Teléfono:</Text>
                <Text style={styles.fieldValue}>{pet.owner.phone}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Fecha de emisión:</Text>
                <Text style={styles.fieldValue}>{dateFormatted}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Diagnóstico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnóstico Clínico</Text>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#111827', marginTop: 2 }}>
            {treatment.diagnosis}
          </Text>
        </View>

        {/* Medicamentos Prescritos */}
        {treatment.medications && treatment.medications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prescripción de Medicamentos (Rp.)</Text>
            {treatment.medications.map((med, index) => (
              <View key={index} style={styles.medicationBox}>
                <View style={styles.medHeader}>
                  <Text style={styles.medName}>
                    {index + 1}. {med.commercialName || med.activeIngredient}
                  </Text>
                  <Text style={styles.medActive}>Principio: {med.activeIngredient}</Text>
                </View>
                <Text style={styles.medDetail}>
                  • Vía: {med.route || 'Oral'}   • Dosis: {med.dose}
                </Text>
                <Text style={styles.medDetail}>
                  • Frecuencia: {med.frequency}   • Duración: {med.durationDays} días
                </Text>
                {med.notes && (
                  <Text style={styles.medNotes}>
                    Indicación: {med.notes}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Procedimientos Realizados o Indicados */}
        {treatment.procedures && treatment.procedures.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Procedimientos e Intervenciones</Text>
            <Text style={{ fontSize: 9.5, color: '#374151' }}>
              {treatment.procedures.join(' • ')}
            </Text>
          </View>
        )}

        {/* Recomendaciones Generales */}
        {treatment.recommendations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recomendaciones y Cuidados</Text>
            <Text style={styles.recommendationsText}>{treatment.recommendations}</Text>
          </View>
        )}

        {/* Honorarios y Presupuesto */}
        {treatment.servicePrice && (
          <View style={[styles.section, { backgroundColor: '#f0fdf4', padding: 8, borderRadius: 4, borderWidth: 1, borderColor: '#bbf7d0' }]}>
            <Text style={[styles.sectionTitle, { color: '#166534', marginBottom: 2 }]}>Honorarios del Servicio</Text>
            <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: '#14532d' }}>
              Monto: ${treatment.servicePrice.amountUSD.toFixed(2)} USD ({formatVES(treatment.servicePrice.amountVES)})
            </Text>
            <Text style={{ fontSize: 8, color: '#15803d', marginTop: 1 }}>
              Tasa aplicada: {treatment.servicePrice.rateSource} = {formatVES(treatment.servicePrice.rateUsed)} ({treatment.servicePrice.rateDate})
            </Text>
          </View>
        )}

        {/* Pie de Página con Firma */}
        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            Generado por VetApp • Documento de validez clínica veterinaria
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
