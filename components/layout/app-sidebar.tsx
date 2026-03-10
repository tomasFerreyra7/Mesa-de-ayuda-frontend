'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Ticket, Monitor, Package, FileText, Building2, Users, MapPin, ChevronLeft, Scale } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { UserAvatarMenu } from './user-avatar-menu';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  // Dashboard solo admin/operario; técnicos solo ven Tickets
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'Principal', roles: ['admin', 'operario'] },
  { label: 'Tickets', href: '/tickets', icon: Ticket, section: 'Principal' },
  // Inventario y Gestión solo admin/operario
  { label: 'Equipos', href: '/equipos', icon: Monitor, section: 'Inventario', roles: ['admin', 'operario'] },
  { label: 'Software', href: '/software', icon: Package, section: 'Inventario', roles: ['admin', 'operario'] },
  { label: 'Contratos', href: '/contratos', icon: FileText, section: 'Gestión', roles: ['admin', 'operario'] },
  { label: 'Proveedores', href: '/proveedores', icon: Building2, section: 'Gestión', roles: ['admin', 'operario'] },
  // Config solo admin
  { label: 'Usuarios', href: '/usuarios', icon: Users, section: 'Configuración', roles: ['admin'] },
  { label: 'Ubicaciones', href: '/ubicaciones', icon: MapPin, section: 'Configuración', roles: ['admin'] },
];

export function AppSidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();

  // Group nav items by section
  const sections = NAV_ITEMS.reduce(
    (acc, item) => {
      if (item.roles && user && !item.roles.includes(user.rol)) return acc;
      const section = item.section ?? 'General';
      if (!acc[section]) acc[section] = [];
      acc[section].push(item);
      return acc;
    },
    {} as Record<string, NavItem[]>,
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-50 flex flex-col',
        'bg-sidebar border-r border-sidebar-border',
        'transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Header */}
      <div className={cn('h-[60px] flex items-center border-b border-sidebar-border flex-shrink-0', collapsed ? 'justify-center px-0' : 'px-4 gap-3')}>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <Scale className="w-4 h-4 text-sidebar-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sidebar-accent-foreground leading-tight truncate">SistemaPJ</p>
              <p className="text-[10px] text-sidebar-foreground/60 leading-tight truncate">Mesa de Ayuda</p>
            </div>
          </motion.div>
        )}

        <button
          onClick={toggle}
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0',
            'bg-white/5 hover:bg-white/10 text-sidebar-foreground hover:text-sidebar-accent-foreground',
            'transition-colors',
          )}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </motion.div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="mb-1">
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40"
                >
                  {section}
                </motion.p>
              )}
            </AnimatePresence>

            {items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 mx-2 px-2.5 py-2 rounded-lg',
                    'transition-all duration-150',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-white/5 hover:text-sidebar-accent-foreground',
                    collapsed && 'justify-center',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-sm font-medium whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-2 flex-shrink-0">
        <UserAvatarMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}

