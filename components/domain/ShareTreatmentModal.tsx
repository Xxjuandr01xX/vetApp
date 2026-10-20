'use client';

import { useState } from 'react';
import { Modal, Button, Spinner, Alert } from 'flowbite-react';
import { HiDownload, HiShare, HiCheck, HiExclamationCircle } from 'react-icons/hi';
import { Treatment } from '@/lib/types/treatment';
import { Pet } from '@/lib/types/pet';
import { useAuth } from '@/lib/hooks/useAuth';
import { generateTreatmentPdfBlob } from '@/lib/utils/pdf-generator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatVES } from '@/lib/utils/currency';

interface ShareTreatmentModalProps {
  show: boolean;
  onClose: () => void;
  treatment: Treatment | null;
  pet: Pet | null;
}

export function formatWhatsAppPhone(phone: string): string {
  // Eliminar todo lo que no sea dígito
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Si escribieron +580414... (58 seguido de 0), quitar el 0 intermedio
  if (digits.startsWith('580') && digits.length === 13) {
    return '58' + digits.slice(3);
  }

  // Si comienza con 0 (ej. 04141234567 en Venezuela), convertir a código país 58
  if (digits.startsWith('0')) {
    return '58' + digits.slice(1);
  }

  // Si ya tiene 10 dígitos empezando en 4 o 2 (ej. 4141234567), anteponer 58
  if (digits.length === 10 && (digits.startsWith('4') || digits.startsWith('2'))) {
    return '58' + digits;
  }

  return digits;
}

export function buildWhatsAppMessage(
  treatment: Treatment,
  pet: Pet,
  vetName: string
): string {
  const d = treatment.createdAt
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

  let msg = `🐾 *RÉCIPE MÉDICO VETERINARIO*\n`;
  msg += `*VetApp — Atención Veterinaria*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🗓 *Fecha:* ${d}\n`;
  msg += `🐶 *Paciente:* ${pet.name} (${pet.species}${pet.breed ? ` - ${pet.breed}` : ''})\n`;
  msg += `👤 *Tutor:* ${pet.owner.name}\n`;
  if (treatment.weightAtVisit) {
    msg += `⚖️ *Peso:* ${treatment.weightAtVisit} kg\n`;
  }
  msg += `🩺 *Diagnóstico:* ${treatment.diagnosis}\n`;

  if (treatment.medications && treatment.medications.length > 0) {
    msg += `\n💊 *INDICACIONES / MEDICAMENTOS (Rp.):*\n`;
    treatment.medications.forEach((med, i) => {
      msg += `\n*${i + 1}. ${med.commercialName || med.activeIngredient}*\n`;
      msg += `   • *Dosis:* ${med.dose}\n`;
      msg += `   • *Vía:* ${med.route || 'Oral'}\n`;
      msg += `   • *Frecuencia:* ${med.frequency}\n`;
      msg += `   • *Duración:* ${med.durationDays} días\n`;
      if (med.notes) {
        msg += `   • *Nota:* ${med.notes}\n`;
      }
    });
  }

  if (treatment.procedures && treatment.procedures.length > 0) {
    msg += `\n🔬 *Procedimientos:* ${treatment.procedures.join(', ')}\n`;
  }

  if (treatment.recommendations) {
    msg += `\n📋 *Recomendaciones:* ${treatment.recommendations}\n`;
  }

  if (treatment.servicePrice) {
    msg += `\n💰 *Honorarios:* $${treatment.servicePrice.amountUSD.toFixed(2)} USD (${formatVES(treatment.servicePrice.amountVES)})\n`;
    msg += `   _Tasa ${treatment.servicePrice.rateSource}: ${formatVES(treatment.servicePrice.rateUsed)}_\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `👨‍⚕️ *Médico Veterinario:* ${vetName}\n`;
  msg += `📎 _Adjunto te comparto el récipe médico oficial en formato PDF._`;

  return msg;
}

export function ShareTreatmentModal({
  show,
  onClose,
  treatment,
  pet,
}: ShareTreatmentModalProps) {
  const { profile } = useAuth();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!treatment || !pet) return null;

  const vetName = profile?.displayName || 'Médico Veterinario';
  const fileName = `Recipe_${pet.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;

  // Generar blob de PDF bajo demanda (lazy import de @react-pdf/renderer)
  const generateBlob = async (): Promise<Blob> => {
    return await generateTreatmentPdfBlob(treatment, pet, vetName);
  };

  // Descargar archivo PDF
  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    setError('');
    try {
      const blob = await generateBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error generando PDF:', err);
      setError('Error al generar el documento PDF. Intenta nuevamente.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Compartir nativamente con el PDF adjunto (móvil o navegadores compatibles)
  const handleShareNativeWithPdf = async () => {
    setGeneratingPdf(true);
    setError('');
    try {
      const blob = await generateBlob();
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        const message = buildWhatsAppMessage(treatment, pet, vetName);
        await navigator.share({
          files: [file],
          title: `Récipe Médico - ${pet.name}`,
          text: message,
        });
        return;
      }

      // Si no soporta compartir archivos directamente por navegador web:
      // Primero descargamos el PDF y abrimos WhatsApp con el texto preparado
      handleDownloadPdf();
      handleOpenWhatsApp();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error compartiendo PDF:', err);
        // Fallback a WhatsApp Web / link
        handleOpenWhatsApp();
      }
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Abrir WhatsApp con el récipe formateado
  const handleOpenWhatsApp = () => {
    const cleanPhone = formatWhatsAppPhone(pet.owner.phone);
    const message = buildWhatsAppMessage(treatment, pet, vetName);
    const encoded = encodeURIComponent(message);

    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(waUrl, '_blank');
  };

  return (
    <Modal show={show} size="lg" onClose={onClose}>
      <Modal.Header>
        📄 Enviar Récipe Médico por WhatsApp
      </Modal.Header>

      <Modal.Body>
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-3">
            <span className="text-3xl">🐾</span>
            <div className="text-xs text-blue-950">
              <p className="font-bold text-sm text-vet-primary">{pet.name} — {treatment.diagnosis}</p>
              <p className="text-gray-600 mt-0.5">
                Tutor: <span className="font-semibold">{pet.owner.name}</span> • Tel: <span className="font-semibold">{pet.owner.phone}</span>
              </p>
            </div>
          </div>

          {error && (
            <Alert color="failure" icon={HiExclamationCircle}>
              {error}
            </Alert>
          )}

          {downloadSuccess && (
            <Alert color="success" icon={HiCheck}>
              ¡PDF descargado con éxito! Ya puedes enviarlo o adjuntarlo en WhatsApp.
            </Alert>
          )}

          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Opciones de Envío
            </h4>

            {/* Botón 1: Descargar el PDF oficial */}
            <Button
              color="light"
              className="w-full justify-center border-gray-300"
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Generando documento PDF...
                </>
              ) : (
                <>
                  <HiDownload className="mr-2 h-4 w-4 text-vet-primary" />
                  Descargar Récipe en PDF
                </>
              )}
            </Button>

            {/* Botón 2: Enviar por WhatsApp con mensaje pre-redactado */}
            <button
              onClick={handleShareNativeWithPdf}
              disabled={generatingPdf}
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors text-sm"
            >
              <span className="text-lg">📲</span>
              Compartir Récipe en WhatsApp
            </button>

            <p className="text-[11px] text-gray-500 text-center leading-relaxed">
              Al hacer clic en WhatsApp, se abrirá el chat con el tutor (<span className="font-semibold">{pet.owner.phone}</span>) incluyendo el récipe médico detallado y el archivo PDF listo para enviar.
            </p>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <div className="flex justify-end w-full">
          <Button color="gray" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
