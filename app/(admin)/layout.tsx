'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getStoredAdminPin,
  verifyAdminSecretPin,
  clearStoredAdminPin,
} from '@/lib/services/admin-panel';
import { Spinner, Badge, Card, Button, Alert, TextInput, Label } from 'flowbite-react';
import { HiLockClosed, HiCreditCard, HiUsers, HiKey } from 'react-icons/hi';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checkingSession, setCheckingSession] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    const savedPin = getStoredAdminPin();
    if (savedPin) {
      verifyAdminSecretPin(savedPin)
        .then((res) => {
          if (res.valid) {
            setUnlocked(true);
          } else {
            clearStoredAdminPin();
          }
        })
        .finally(() => setCheckingSession(false));
    } else {
      setCheckingSession(false);
    }
  }, []);

  const handleUnlockPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setPinError('');

    try {
      const res = await verifyAdminSecretPin(pinInput);
      if (res.valid) {
        setUnlocked(true);
        setPinInput('');
      } else {
        setPinError(res.error || 'PIN secreto incorrecto');
      }
    } catch (err: any) {
      setPinError(err?.message || 'Error al verificar el PIN');
    } finally {
      setVerifying(false);
    }
  };

  const handleLockPanel = () => {
    clearStoredAdminPin();
    setUnlocked(false);
    setPinInput('');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
        <Spinner size="xl" color="purple" />
        <p className="mt-4 text-sm font-semibold text-gray-300">
          Cargando consola administrativa de VetApp...
        </p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
        <Card className="max-w-md w-full border-t-4 border-t-purple-600 shadow-2xl">
          <form onSubmit={handleUnlockPanel} className="space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                <HiLockClosed className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-extrabold text-gray-900">
                Consola Administrativa VetApp (/panel)
              </h1>
              <p className="text-xs text-gray-500">
                Herramienta privada de administración. Ingresa tu PIN secreto para gestionar usuarios Premium y coordenadas de Pago Móvil / Binance.
              </p>
            </div>

            {pinError && (
              <Alert color="failure" className="text-xs">
                {pinError}
              </Alert>
            )}

            <div>
              <Label
                htmlFor="admin-secret-pin"
                value="PIN Secreto Administrativo"
                className="mb-1.5 block font-semibold text-gray-700"
              />
              <TextInput
                id="admin-secret-pin"
                type="password"
                icon={HiKey}
                placeholder="Ej. X1X-Y24"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                color="purple"
                disabled={verifying || !pinInput.trim()}
                className="w-full font-bold"
              >
                {verifying ? (
                  <>
                    <Spinner size="sm" className="mr-2" /> Verificando PIN...
                  </>
                ) : (
                  '🔓 Ingresar al Panel Administrativo'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar Independiente del Panel Administrativo */}
      <header className="bg-gray-900 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/panel" className="flex items-center gap-2">
              <span className="text-xl">👑</span>
              <span className="font-extrabold text-lg text-white">VetApp /panel</span>
            </Link>
            <Badge color="purple" className="hidden sm:inline-flex">Consola Privada</Badge>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-sm">
            <Link
              href="/panel"
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors flex items-center gap-1.5"
            >
              <HiUsers className="h-4 w-4 text-purple-400" />
              <span className="hidden sm:inline">Panel Principal</span>
            </Link>

            <Link
              href="/admin/payments"
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors flex items-center gap-1.5"
            >
              <HiCreditCard className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline">Comprobantes</span>
            </Link>

            <button
              type="button"
              onClick={handleLockPanel}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
              title="Cerrar sesión del panel administrativo"
            >
              <HiLockClosed className="h-4 w-4" />
              <span>Bloquear Panel</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
