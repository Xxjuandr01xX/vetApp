'use client';

import Link from 'next/link';
import { Button, Card } from 'flowbite-react';
import { HiRefresh, HiHome, HiWifi } from 'react-icons/hi';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
          <HiWifi className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-gray-900">
          Sin conexión a Internet
        </h1>

        <p className="text-sm text-gray-600">
          Estás operando en <strong>Modo Offline</strong>. El Vademécum veterinario y los datos sincronizados previamente en tu dispositivo siguen disponibles en la caché local (IndexedDB).
        </p>

        <div className="grid grid-cols-2 gap-2 text-left my-2">
          <Link
            href="/dashboard"
            className="p-3 rounded-lg border border-gray-200 hover:border-vet-primary bg-gray-50 hover:bg-white transition-colors"
          >
            <span className="text-lg block">🏠</span>
            <span className="text-xs font-semibold text-gray-800">Dashboard</span>
          </Link>
          <Link
            href="/pets"
            className="p-3 rounded-lg border border-gray-200 hover:border-vet-primary bg-gray-50 hover:bg-white transition-colors"
          >
            <span className="text-lg block">🐾</span>
            <span className="text-xs font-semibold text-gray-800">Pacientes</span>
          </Link>
          <Link
            href="/appointments"
            className="p-3 rounded-lg border border-gray-200 hover:border-vet-primary bg-gray-50 hover:bg-white transition-colors"
          >
            <span className="text-lg block">📅</span>
            <span className="text-xs font-semibold text-gray-800">Agenda</span>
          </Link>
          <Link
            href="/treatments"
            className="p-3 rounded-lg border border-gray-200 hover:border-vet-primary bg-gray-50 hover:bg-white transition-colors"
          >
            <span className="text-lg block">💊</span>
            <span className="text-xs font-semibold text-gray-800">Tratamientos</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            onClick={handleRetry}
            className="w-full bg-vet-primary hover:bg-vet-primary/90"
          >
            <HiRefresh className="mr-2 h-4 w-4" />
            Reintentar conexión
          </Button>
          <Link href="/dashboard" className="w-full">
            <Button color="light" className="w-full">
              <HiHome className="mr-2 h-4 w-4" />
              Ir al Inicio
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
