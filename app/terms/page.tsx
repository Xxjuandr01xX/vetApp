import Link from 'next/link';
import { Card, Badge, Button } from 'flowbite-react';
import {
  HiDocumentText,
  HiShieldCheck,
  HiScale,
  HiCreditCard,
  HiCheckCircle,
  HiExclamation,
  HiArrowLeft,
} from 'react-icons/hi';

export const metadata = {
  title: 'Términos y Condiciones — VetApp',
  description:
    'Términos y Condiciones de Uso del sistema de gestión clínica veterinaria VetApp.',
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-surface-subtle py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navegación superior */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-medium text-vet-primary hover:underline"
          >
            <HiArrowLeft className="mr-1.5 h-4 w-4" /> Volver a VetApp
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/privacy">
              <Button size="xs" color="light">
                <HiShieldCheck className="mr-1.5 h-4 w-4 text-vet-primary" />
                Ver Políticas de Privacidad
              </Button>
            </Link>
          </div>
        </div>

        {/* Encabezado */}
        <Card className="border-t-4 border-t-vet-primary shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-50 text-vet-primary">
                <HiDocumentText className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  Términos y Condiciones de Uso
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  VetApp — Plataforma de Gestión para Médicos Veterinarios
                </p>
              </div>
            </div>
            <Badge color="info" className="w-fit">
              Vigencia: Octubre 2026
            </Badge>
          </div>

          <div className="space-y-6 text-sm text-gray-700 leading-relaxed pt-2">
            <p>
              Bienvenido a <strong>VetApp</strong>. Los presentes Términos y Condiciones regulan el acceso y uso de la aplicación web y progresiva (PWA) <strong>VetApp</strong> por parte de médicos veterinarios y profesionales de la salud animal. Al crear una cuenta o utilizar el sistema, aceptas cumplir con las disposiciones aquí establecidas.
            </p>

            {/* 1. Naturaleza del Servicio y Responsabilidad Médica */}
            <section className="space-y-2">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <HiExclamation className="text-amber-500 h-5 w-5 shrink-0" />
                1. Naturaleza del Servicio y Criterio Clínico Profesional
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>
                  <strong>Herramienta de Gestión y Apoyo:</strong> VetApp es un software de organización clínica, agenda de citas, registro de historiales, emisión de récipes y consulta farmacológica de referencia.
                </li>
                <li>
                  <strong>Responsabilidad del Médico Veterinario:</strong> La información contenida en el Vademécum integrado y los cálculos sugeridos por la calculadora de dosis según el peso son herramientas de apoyo referencial. El diagnóstico, la elección del fármaco, la posología definitiva y el tratamiento prescrito son responsabilidad exclusiva e indelegable del médico veterinario tratante.
                </li>
              </ul>
            </section>

            {/* 2. Cuenta de Usuario y PIN de Acceso */}
            <section className="space-y-2">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <HiCheckCircle className="text-vet-primary h-5 w-5 shrink-0" />
                2. Registro de Cuenta y Seguridad del PIN
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>
                  Para utilizar VetApp debes registrarte con tu nombre profesional, un correo electrónico válido y configurar un PIN personal de 6 dígitos.
                </li>
                <li>
                  Eres responsable de mantener la confidencialidad de tu PIN de acceso y de todas las actividades clínicas registradas desde tu sesión.
                </li>
                <li>
                  Por razones de seguridad, el sistema aplicará un bloqueo temporal automático de 15 minutos en caso de detectar 5 intentos fallidos consecutivos de inicio de sesión.
                </li>
              </ul>
            </section>

            {/* 3. Planes de Suscripción (Básico y Premium) */}
            <section className="space-y-2">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <HiCreditCard className="text-vet-primary h-5 w-5 shrink-0" />
                3. Planes de Uso, Pagos y Activación del Modo Premium
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>
                  <strong>Plan Básico (Gratuito):</strong> Permite el registro de hasta treinta (30) pacientes activos, gestión de citas, consulta del vademécum global y emisión de récipes y comprobantes en PDF/WhatsApp sin costo.
                </li>
                <li>
                  <strong>Modo Premium:</strong> Desbloquea pacientes ilimitados, calculadora automática de dosis farmacológicas por peso, creación de medicamentos personalizados en el vademécum privado y reportes financieros avanzados.
                </li>
                <li>
                  <strong>Modalidades de Pago:</strong> Las suscripciones al Modo Premium pueden abonarse de forma mensual o anual a través de <strong>Pago Móvil</strong> (en Bolívares calculados a la tasa oficial vigente del BCV) o mediante <strong>Binance Pay (USDT)</strong> utilizando los datos oficiales mostrados en la página de suscripción (<code>/pricing</code>).
                </li>
                <li>
                  <strong>Verificación Manual:</strong> Una vez reportado el pago con su número de referencia y comprobante, la administración verificará la transacción para activar el período contratado (30 días para el plan mensual o 365 días para el plan anual). Los pagos procesados no son reembolsables una vez activado el período de suscripción.
                </li>
              </ul>
            </section>

            {/* 4. Tasa BCV y Cálculos Monetarios */}
            <section className="space-y-2">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <HiScale className="text-vet-primary h-5 w-5 shrink-0" />
                4. Referencia Cambiaria BCV y Honorarios
              </h2>
              <p className="text-gray-600">
                VetApp facilita el cálculo automático de honorarios médicos en Dólares (USD) y su equivalente en Bolívares (VES) consultando la tasa oficial del Banco Central de Venezuela (BCV), además de permitir ingresar una tasa manual cuando el profesional lo requiera. El veterinario es responsable de verificar los montos finales antes de emitir un comprobante o presupuesto al tutor de la mascota.
              </p>
            </section>

            {/* 5. Disponibilidad y Propiedad Intelectual */}
            <section className="space-y-2">
              <h2 className="text-base font-bold text-gray-900">
                5. Propiedad Intelectual y Disponibilidad del Servicio
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>
                  El diseño, código fuente, logotipos, estructura del vademécum y funcionalidades de <strong>VetApp</strong> están protegidos por las leyes de propiedad intelectual aplicables.
                </li>
                <li>
                  Los datos clínicos introducidos por el veterinario pertenecen exclusivamente al profesional, quien puede respaldarlos y exportarlos en formato CSV y PDF en cualquier momento.
                </li>
              </ul>
            </section>

            {/* Pie de enlace */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-bold text-gray-900">Privacidad y Protección de Datos</p>
                <p>Consulta también cómo resguardamos tus expedientes clínicos y datos personales.</p>
              </div>
              <Link href="/privacy">
                <Button size="xs" className="bg-vet-primary hover:bg-vet-primary/90 shrink-0">
                  Ver Políticas de Privacidad
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
