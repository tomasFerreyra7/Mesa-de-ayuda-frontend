'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User, KeyRound } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { getInitials, cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  collapsed: boolean;
}

export function UserAvatarMenu({ collapsed }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    logout();
    router.push('/login');
    toast.success('Sesión cerrada');
  };

  if (!user) return null;

  const initials = user.iniciales ?? getInitials(user.nombre);
  const avatarColor = user.avatarColor ?? '#2563EB';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'flex items-center gap-2.5 w-full rounded-lg px-2 py-2',
            'hover:bg-white/5 text-sidebar-foreground transition-colors',
            collapsed && 'justify-center',
          )}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium text-sidebar-accent-foreground truncate max-w-[140px]">{user.nombre}</span>
              <span className="text-[10px] text-sidebar-foreground/60 truncate max-w-[140px] capitalize">{user.rol.replace('_', ' ')}</span>
            </div>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={8}
          className={cn('min-w-48 rounded-xl bg-card border border-border shadow-xl p-1.5', 'data-[state=open]:animate-fade-in z-[200]')}
        >
          <div className="px-2 py-2 mb-1 border-b border-border">
            <p className="text-sm font-medium text-foreground">{user.nombre}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>

          <DropdownMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-foreground cursor-pointer hover:bg-secondary outline-none"
            onSelect={() => router.push('/perfil')}
          >
            <User className="w-4 h-4 text-muted-foreground" />
            Mi perfil
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-foreground cursor-pointer hover:bg-secondary outline-none"
            onSelect={() => router.push('/perfil?tab=password')}
          >
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            Cambiar contraseña
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 border-t border-border" />

          <DropdownMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-danger cursor-pointer hover:bg-danger-light outline-none"
            onSelect={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

