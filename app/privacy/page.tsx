import Link from 'next/link';
import { Card, Badge, Button } from 'flowbite-react';
import {
  HiShieldCheck,
  HiLockClosed,
  HiDatabase,
  HiUserGroup,
  HiDocumentText,
  HiArrowLeft,
} from 'react-icons/hi';

export const metadata = {
  title: 'Políticas de Privacidad — VetApp',
  description:
    'Políticas de Privacidad, protección de datos clínicos y confidencialidad de VetApp.',
};

export default function PrivacyPolicyPage() {
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
            <Link href="/terms">
              <Button size="xs" color="light">
                <HiDocumentText className="mr-1.5 h-4 w-4 text-vet-primary" />
                Ver Términos y Condiciones
              </Button>
            </Link>
          </div>
        </div>

        {/* Encabezado */}
        <Card className="border-t-4 border-t-vet-primary shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-50 text-vet-primary">
                <HiShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  Políticas de Privacidad
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  VetApp — Sistema de Gestión Clínica Veterinaria
                </p>
              </div>
            </div>
            <Badge color="info" className="w-fit">
              Última actualización: Octubre 2026
            </Badge>
          </div>

          <div className="space-y-6 text-sm text-gray-700 leading-relaxed pt-2">
            <p>
              En <strong>VetApp</strong> valoramos y protegemos la privacidad de los médicos veterinarios y la confidencialidad de la información clínica de sus pacientes y tutores. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y resguardamos tus datos dentro de nuestra plataforma.
            </p>

            {/* 1. Información que recopilamos */}
            <section className="space-y-2">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <HiUserGroup className="text-vet-primary h-5 w-5 shrink-0" />
                1. Información que Recopilamos
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>
                  <strong>Datos de Registro del Médico Veterinario:</strong> Nombre completo o nombre profesional, dirección de correo electrónico y un PIN de acceso de 6 dígitos (el cual se almacena únicamente mediante hash criptográfico irreversible <code>bcrypt</code>).
                </li>
                <li>
                  <strong>Información Clínica y de Pacientes:</strong> Datos de las mascotas (nombre, especie, raza, peso, alergias, antecedentes), datos de contacto de los tutores (nombre, teléfono para recordatorios vía WhatsApp, correo opcional), citas agendadas, diagnósticos, tratamientos y récipes emitidos.
                </li>
                <li>
                  <strong>Datos de Suscripción y Pagos:</strong> Cuando solicitas la activación del modo Premium mediante Pago Móvil o Binance Pay, recopilamos el número de referencia bancaria, método seleccionado, monto y la imagen del comprobante de transferencia con el único fin de verificar y activar tu suscripción.
                </li>
              </ul>
            </section>

            {/* 2. Aislamiento y Propiedad de los Datos */}
            <section className="space-y-2">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <HiDatabase className="text-vet-primary h-5 w-5 shrink-0" />
                2. Aislamiento Estricto y Propiedad de los Datos Clínicos
              </h2>
              <p className="text-gray-600">
                Cada médico veterinario es el único propietario de la cartera de pacientes, historiales clínicos y fármacos personalizados que registra en <strong>VetApp</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>
                  Todos los registros clínicos están estrictamente aislados mediante identificadores únicos de propietario (<code>vetId</code>) protegidos por reglas de seguridad en la base de datos.
                </li>
                <li>
                  Ningún otro veterinario registrado en la plataforma puede consultar, modificar ni acceder a tus pacientes, citas, honorarios o tratamientos.
                </li>
                <li>
                  <strong>VetApp</strong> no comercializa, alquila ni comparte bases de datos de pacientes ni de tutores con terceros bajo ninguna circunstancia.
                </li>
              </ul>
            </section>

            {/* 3. Seguridad y Almacenamiento */}
            <section className="space-y-2">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <HiLockClosed className="text-vet-primary h-5 w-5 shrink-0" />
                3. Seguridad de la Información y Modo Offline (PWA)
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>
                  <strong>Cifrado y Autenticación:</strong> Todas las comunicaciones entre tu dispositivo y nuestros servidores se realizan bajo cifrado HTTPS/TLS. El acceso está protegido por tu PIN de 6 dígitos con bloqueo temporal automático tras intentos fallidos consecutivos.
                </li>
                <li>
                  <strong>Caché Local (IndexedDB):</strong> Para permitir que consultes tu agenda, pacientes y el vademécum cuando tengas fallas de conectividad a internet, VetApp guarda una copia temporal en el almacenamiento local de tu navegador/dispositivo. Al cerrar sesión en un equipo compartido, puedes limpiar estos datos locales de forma inmediata.
                </li>
              </ul>
            </section>

            {/* 4. Uso de la Información */}
            <section className="space-y-2">
              <h2 className="text-base font-bold text-gray-900">
                4. Finalidad del Uso de los Datos
              </h2>
              <p className="text-gray-600">
                Utilizamos la información recopilada exclusivamente para:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>Proveer y sincronizar tu consultorio digital en múltiples dispositivos.</li>
                <li>Generar récipes médicos veterinarios, comprobantes de citas e historiales clínicos en formato PDF (procesados directamente en tu navegador).</li>
                <li>Facilitar el envío voluntario de recordatorios y récipes a los tutores mediante enlaces directos de WhatsApp accionados por el veterinario.</li>
                <li>Calcular equivalencias informativas de honorarios en Bolívares (VES) tomando como referencia la tasa oficial publicada por el Banco Central de Venezuela (BCV).</li>
              </ul>
            </section>

            {/* 5. Derechos del Usuario */}
            <section className="space-y-2">
              <h2 className="text-base font-bold text-gray-900">
                5. Derechos de Acceso, Portabilidad y Eliminación
              </h2>
              <p className="text-gray-600">
                Como usuario de <strong>VetApp</strong>, tienes derecho en todo momento a:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>
                  <strong>Exportar tu información:</strong> Puedes descargar tus listados de pacientes, citas, tratamientos y reportes financieros en formato CSV compatible con Excel o en documentos PDF cuando lo desees.
                </li>
                <li>
                  <strong>Actualizar o eliminar registros:</strong> Puedes editar fichas clínicas, actualizar tu PIN de seguridad o solicitar la baja definitiva de tu cuenta y sus datos asociados.
                </li>
              </ul>
            </section>

            {/* Pie de contacto */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-bold text-gray-900">¿Tienes dudas sobre el tratamiento de tus datos?</p>
                <p>Al utilizar VetApp, aceptas las prácticas descritas en esta Política de Privacidad.</p>
              </div>
              <Link href="/terms">
                <Button size="xs" className="bg-vet-primary hover:bg-vet-primary/90 shrink-0">
                  Leer Términos y Condiciones
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
