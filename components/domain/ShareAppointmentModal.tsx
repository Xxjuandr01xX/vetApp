'use client';

import { useState } from 'react';
import { Modal, Button, Spinner, Alert } from 'flowbite-react';
import { HiDownload, HiShare, HiCheck, HiExclamationCircle } from 'react-icons/hi';
import { Appointment } from '@/lib/types/appointment';
import { Pet } from '@/lib/types/pet';
import { useAuth } from '@/lib/hooks/useAuth';
import { generateAppointmentPdfBlob } from '@/lib/utils/pdf-generator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatVES } from '@/lib/utils/currency';

interface ShareAppointmentModalProps {
  show: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  pet: Pet | null;
}

export function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('580') && digits.length === 13) {
    return '58' + digits.slice(3);
  }

  if (digits.startsWith('0')) {
    return '58' + digits.slice(1);
  }

  if (digits.length === 10 && (digits.startsWith('4') || digits.startsWith('2'))) {
    return '58' + digits;
  }

  return digits;
}

export function getAppointmentDateObj(dateVal: any): Date {
  if (dateVal instanceof Date) return dateVal;
  if (dateVal?.toDate && typeof dateVal.toDate === 'function') return dateVal.toDate();
  return new Date(dateVal);
}

export function buildAppointmentWhatsAppMessage(
  appointment: Appointment,
  pet: Pet,
  vetName: string
): string {
  const appointmentDate = getAppointmentDateObj(appointment.date);
  let dateFormatted = format(appointmentDate, "EEEE d 'de' MMMM, yyyy", { locale: es });
  dateFormatted = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
  const timeFormatted = format(appointmentDate, 'hh:mm a', { locale: es });

  let msg = `📅 *RECORDATORIO DE CITA VETERINARIA*\n`;
  msg += `*VetApp — Atención Veterinaria*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🐾 *Paciente:* ${pet.name} (${pet.species}${pet.breed ? ` - ${pet.breed}` : ''})\n`;
  msg += `👤 *Tutor:* ${pet.owner.name}\n`;
  msg += `🗓 *Fecha:* ${dateFormatted}\n`;
  msg += `⏰ *Hora:* ${timeFormatted} (${appointment.durationMin} min)\n`;
  msg += `🩺 *Motivo:* ${appointment.reason}\n`;

  if (appointment.notes) {
    msg += `📝 *Observaciones:* ${appointment.notes}\n`;
  }

  if (appointment.servicePrice) {
    msg += `\n💰 *Honorarios de la Cita:* $${appointment.servicePrice.amountUSD.toFixed(2)} USD (${formatVES(appointment.servicePrice.amountVES)})\n`;
    msg += `   _Tasa BCV (${appointment.servicePrice.rateSource}): ${formatVES(appointment.servicePrice.rateUsed)}_\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `👨‍⚕️ *Médico Asignado:* ${vetName}\n`;
  msg += `📎 _Te adjuntamos el comprobante oficial de la cita en PDF. ¡Te esperamos!_`;

  return msg;
}

export function ShareAppointmentModal({
  show,
  onClose,
  appointment,
  pet,
}: ShareAppointmentModalProps) {
  const { user, profile } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!appointment || !pet) return null;

  const vetName = profile?.displayName || user?.displayName || 'Dr. Médico Veterinario';
  const appointmentDate = getAppointmentDateObj(appointment.date);
  const formattedDate = format(appointmentDate, "EEEE d 'de' MMMM, yyyy", { locale: es });
  const formattedTime = format(appointmentDate, 'hh:mm a', { locale: es });

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      setError(null);

      const blob = await generateAppointmentPdfBlob(appointment, pet, vetName);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = pet.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeDate = format(appointmentDate, 'yyyy-MM-dd');
      link.download = `Cita_${safeName}_${safeDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error al generar PDF de la cita:', err);
      setError('Ocurrió un error al generar el PDF. Por favor, intenta de nuevo.');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const rawPhone = pet.owner.phone || '';
    const formattedPhone = formatWhatsAppPhone(rawPhone);
    const message = buildAppointmentWhatsAppMessage(appointment, pet, vetName);
    const encoded = encodeURIComponent(message);

    const waUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyMessage = async () => {
    try {
      const message = buildAppointmentWhatsAppMessage(appointment, pet, vetName);
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setError('No se pudo copiar el texto al portapapeles.');
    }
  };

  return (
    <Modal show={show} onClose={onClose} size="md">
      <Modal.Header>
        Comprobante e Impresión de Cita
      </Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          {error && (
            <Alert color="failure" icon={HiExclamationCircle}>
              {error}
            </Alert>
          )}

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {pet.name} ({pet.species})
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tutor: {pet.owner.name} • Tel: {pet.owner.phone}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-medium">
                {formattedTime}
              </span>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Fecha:</span> {formattedDate}
            </p>
            <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
              <span className="font-semibold">Motivo:</span> {appointment.reason}
            </p>
            {appointment.servicePrice && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs">
                <span className="text-gray-600 dark:text-gray-400">Honorarios fijados:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ${appointment.servicePrice.amountUSD.toFixed(2)} USD ({formatVES(appointment.servicePrice.amountVES)})
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Acciones de Entrega
            </h4>

            {/* Descargar PDF */}
            <Button
              color="blue"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleDownloadPdf}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Generando documento PDF...
                </>
              ) : (
                <>
                  <HiDownload className="w-5 h-5 mr-2" />
                  Descargar Comprobante en PDF
                </>
              )}
            </Button>

            {/* Enviar WhatsApp */}
            <Button
              color="success"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleOpenWhatsApp}
            >
              <HiShare className="w-5 h-5 mr-2" />
              Enviar Recordatorio por WhatsApp
            </Button>

            {/* Copiar texto */}
            <Button
              color="gray"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleCopyMessage}
            >
              {copied ? (
                <>
                  <HiCheck className="w-5 h-5 mr-2 text-green-600" />
                  ¡Texto copiado al portapapeles!
                </>
              ) : (
                'Copiar texto del recordatorio'
              )}
            </Button>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button color="gray" onClick={onClose} className="w-full">
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
