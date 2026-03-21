'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { useUIStore } from '@/store/ui.store';
import { cn } from '@/lib/utils';
import { authApi } from '@/lib/api';
import { normalizeUserFromApi } from '@/lib/normalize-user';

const HYDRATE_TIMEOUT_MS = 2000;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);
  const updateUser = useAuthStore((s) => s.updateUser);
  const router = useRouter();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const meFetched = useRef(false);

  // Si por algún motivo persist no dispara onRehydrateStorage, forzar hidratación tras un tiempo
  useEffect(() => {
    if (hasHydrated) return;
    const t = setTimeout(() => setHasHydrated(), HYDRATE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [hasHydrated, setHasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  // Sincronizar usuario con el backend (p. ej. juzgado_id / juzgado para operarios) sin obligar a cerrar sesión
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || meFetched.current) return;
    meFetched.current = true;
    authApi
      .me()
      .then((res) => {
        const payload = (res.data?.data ?? res.data) as unknown;
        const p = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : undefined;
        const rawUser = (p?.usuario ?? p?.user ?? p) as Record<string, unknown> | undefined;
        if (rawUser && typeof rawUser === 'object' && rawUser.id != null) {
          updateUser(normalizeUserFromApi(rawUser));
        }
      })
      .catch(() => {
        // sesión inválida: el interceptor suele hacer logout
      });
  }, [hasHydrated, isAuthenticated, updateUser]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Cargando…</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className={cn('flex flex-col flex-1 min-w-0 transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]', sidebarCollapsed ? 'ml-16' : 'ml-60')}>
        <AppHeader />
        <main className="flex-1 p-6 page-enter">{children}</main>
      </div>
    </div>
  );
}

