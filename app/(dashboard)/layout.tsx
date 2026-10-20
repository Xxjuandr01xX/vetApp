import AuthGuard from '@/components/layout/AuthGuard';
import { DashboardNavbar, MobileBottomNav } from '@/components/layout/DashboardNavbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-surface-subtle pb-16 sm:pb-0">
        {/* Navbar con buscador global y BcvRateBadge */}
        <DashboardNavbar />

        {/* Contenido Principal */}
        <main className="p-4 max-w-7xl mx-auto">
          {children}
        </main>

        {/* Bottom Nav (Mobile) */}
        <MobileBottomNav />
      </div>
    </AuthGuard>
  );
}
