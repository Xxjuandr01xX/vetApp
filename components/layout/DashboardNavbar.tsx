'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HiSearch, HiDownload, HiCog } from 'react-icons/hi';
import { BcvRateBadge } from '@/components/domain/BcvRateBadge';
import { GlobalSearchModal } from '@/components/domain/GlobalSearchModal';
import { PwaManager } from '@/components/layout/PwaManager';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';

const DESKTOP_NAV_ITEMS = [
  { label: 'Inicio', icon: '🏠', href: '/dashboard' },
  { label: 'Pacientes', icon: '🐾', href: '/pets' },
  { label: 'Citas', icon: '📅', href: '/appointments' },
  { label: 'Tratamientos', icon: '💊', href: '/treatments' },
  { label: 'Vademécum', icon: '⚖️', href: '/medications' },
  { label: 'Reportes', icon: '📊', href: '/reports' },
];

export function DashboardNavbar() {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const { isOnline, canInstall, promptInstall } = useOnlineStatus();
  const pathname = usePathname();

  // Escuchar atajo global Cmd+K o Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <PwaManager />

      {/* Navbar Superior */}
      <nav className="bg-vet-primary text-white px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-md">
        {/* Logo y Enlaces de Navegación Escritorio */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0">
            <span className="text-xl">🐾</span>
            <span className="font-bold text-lg tracking-tight">VetApp</span>
          </Link>
          {!isOnline && (
            <span className="px-2 py-0.5 text-2xs font-bold bg-amber-500 text-white rounded-full">
              ⚡ Offline
            </span>
          )}

          <div className="hidden sm:flex items-center gap-1 ml-2 lg:ml-4 text-xs flex-wrap">
            {DESKTOP_NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                    active
                      ? 'bg-white/20 text-white font-semibold'
                      : 'text-blue-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Barra de Búsqueda Rápida Central (Cmd+K) */}
        <div className="flex-1 max-w-xs lg:max-w-md mx-3 hidden xl:block">
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-blue-100 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <HiSearch className="w-4 h-4 text-blue-200" />
              <span>Buscar paciente, cita, fármaco...</span>
            </span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-3xs font-mono font-semibold bg-white/20 rounded border border-white/20 text-white">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Acciones Derecha */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {canInstall && (
            <button
              type="button"
              onClick={promptInstall}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-xs transition-colors"
              title="Instalar aplicación VetApp en tu dispositivo"
            >
              <HiDownload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {/* Botón de búsqueda compacto cuando la barra grande está oculta */}
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg xl:hidden"
            title="Buscar (Ctrl+K)"
          >
            <HiSearch className="w-5 h-5" />
          </button>

          <BcvRateBadge showRefresh />

          {/* Botón de Ajustes siempre visible en modo escritorio/tablet */}
          <Link
            href="/settings"
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              pathname?.startsWith('/settings')
                ? 'bg-white text-vet-primary shadow-xs'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            }`}
            title="Ajustes de cuenta y preferencias"
          >
            <HiCog className="w-4 h-4" />
            <span>Ajustes</span>
          </Link>
        </div>
      </nav>

      {/* Modal de Búsqueda Global */}
      <GlobalSearchModal
        show={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />
    </>
  );
}

export function MobileBottomNav({ onOpenSearch }: { onOpenSearch?: () => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-2 flex justify-around sm:hidden z-40">
      <NavItem icon="🏠" label="Inicio" href="/dashboard" />
      <NavItem icon="🐾" label="Pacientes" href="/pets" />
      {onOpenSearch && (
        <button
          onClick={onOpenSearch}
          className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-vet-primary dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
        >
          <span className="text-xl">🔍</span>
          <span className="text-xs">Buscar</span>
        </button>
      )}
      <NavItem icon="📅" label="Citas" href="/appointments" />
      <NavItem icon="💊" label="Tratamientos" href="/treatments" />
      <NavItem icon="⚙️" label="Ajustes" href="/settings" />
    </nav>
  );
}

function NavItem({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-vet-primary dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs">{label}</span>
    </Link>
  );
}
