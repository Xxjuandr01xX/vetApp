'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { Card, Button, Badge } from 'flowbite-react';
import Link from 'next/link';
import { HiStar, HiShieldCheck, HiLogout, HiKey, HiArrowRight, HiDocumentText } from 'react-icons/hi';
import { auth } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const isPremium = profile?.role === 'premium' || profile?.role === 'admin';

  return (
    <div className="pb-24 sm:pb-12 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">⚙️ Ajustes de la Cuenta</h1>
        <p className="text-gray-500 text-sm mt-1">Configuración del perfil profesional y suscripción en VetApp.</p>
      </div>

      {/* Perfil del Veterinario */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-vet-primary/10 text-vet-primary flex items-center justify-center text-2xl font-bold shrink-0">
            {profile?.displayName?.charAt(0).toUpperCase() || 'V'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{profile?.displayName || 'Médico Veterinario'}</h2>
            <p className="text-xs text-gray-500">{user?.email}</p>
            <div className="mt-2">
              <Badge color={isPremium ? 'success' : 'gray'}>
                {isPremium ? '⭐ Plan Premium' : 'Plan Básico (Gratuito)'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Suscripción y Planes */}
      <Card>
        <h3 className="font-bold text-gray-800 text-base border-b pb-2 flex items-center gap-2">
          <HiStar className="text-amber-500" />
          Suscripción y Estado
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-600">Plan actual:</span>
            <span className="font-bold text-gray-900">
              {isPremium ? 'Plan Premium Activo' : 'Plan Gratuito (Hasta 30 pacientes)'}
            </span>
          </div>

          {profile?.premiumUntil && (
            <div className="flex justify-between items-center py-1 text-xs">
              <span className="text-gray-500">Válido hasta:</span>
              <span className="font-semibold text-gray-700">
                {format(
                  profile.premiumUntil instanceof Date
                    ? profile.premiumUntil
                    : (profile.premiumUntil as any).toDate(),
                  "d 'de' MMMM, yyyy",
                  { locale: es }
                )}
              </span>
            </div>
          )}

          <div className="pt-2">
            <Link href="/pricing">
              <Button color={isPremium ? 'light' : 'warning'} className="w-full justify-between">
                <span>{isPremium ? 'Ver detalles del Plan' : '⭐ Mejorar a Plan Premium'}</span>
                <HiArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Políticas de Privacidad y Términos */}
      <Card>
        <h3 className="font-bold text-gray-800 text-base border-b pb-2 flex items-center gap-2">
          <HiShieldCheck className="text-vet-primary" />
          Información Legal y Privacidad
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/privacy">
            <Button color="light" className="w-full justify-start">
              <HiShieldCheck className="mr-2 h-4 w-4 text-vet-primary" />
              Políticas de Privacidad
            </Button>
          </Link>

          <Link href="/terms">
            <Button color="light" className="w-full justify-start">
              <HiDocumentText className="mr-2 h-4 w-4 text-vet-primary" />
              Términos y Condiciones
            </Button>
          </Link>
        </div>
      </Card>

      {/* Seguridad y Sesión */}
      <Card>
        <h3 className="font-bold text-gray-800 text-base border-b pb-2 flex items-center gap-2">
          <HiKey className="text-vet-primary" />
          Seguridad
        </h3>
        <div className="space-y-3">
          <Link href="/reset-pin">
            <Button color="light" className="w-full justify-start">
              <span className="mr-2">🔒</span> Cambiar PIN de 6 dígitos
            </Button>
          </Link>

          <Button color="failure" onClick={handleLogout} className="w-full justify-start">
            <HiLogout className="mr-2 h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </Card>
    </div>
  );
}
