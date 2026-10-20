'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from 'flowbite-react';
import { useAuth } from '@/lib/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (requireAdmin && !isAdmin) {
        router.replace('/dashboard');
      }
    }
  }, [loading, isAuthenticated, isAdmin, requireAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-subtle">
        <div className="text-center">
          <Spinner size="xl" color="info" />
          <p className="mt-4 text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requireAdmin && !isAdmin) return null;

  return <>{children}</>;
}
