'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Shield, UserCheck, Wrench, Package } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { usuariosApi } from '@/lib/api';
import type { User, PaginationMeta } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getInitials, cn } from '@/lib/utils';
import { toast } from 'sonner';

const ROLES_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'operario', label: 'Operario' },
  { value: 'tecnico_interno', label: 'Técnico Interno' },
  { value: 'tecnico_proveedor', label: 'Técnico Proveedor' },
] as const;

const rolConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  admin: { label: 'Admin', icon: Shield, className: 'bg-danger-light text-danger border-danger/20' },
  operario: { label: 'Operario', icon: UserCheck, className: 'bg-info-light text-info border-info/20' },
  tecnico_interno: { label: 'Técnico Interno', icon: Wrench, className: 'bg-success-light text-success border-success/20' },
  tecnico_proveedor: { label: 'Técnico Proveedor', icon: Package, className: 'bg-secondary text-muted-foreground border-border' },
};

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'nombre',
    header: 'Usuario',
    cell: ({ row }) => {
      const u = row.original;
      return (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
            style={{ backgroundColor: u.avatarColor ?? '#2563EB' }}
          >
            {u.iniciales ?? getInitials(u.nombre)}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{u.nombre}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'rol',
    header: 'Rol',
    size: 180,
    cell: ({ row }) => {
      const config = rolConfig[row.original.rol];
      if (!config) return null;
      const Icon = config.icon;
      return (
        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border', config.className)}>
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
      );
    },
  },
  {
    accessorKey: 'activo',
    header: 'Estado',
    size: 100,
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex px-2 py-0.5 rounded-md text-xs font-medium border',
          row.original.activo ? 'bg-success-light text-success border-success/20' : 'bg-secondary text-muted-foreground border-border',
        )}
      >
        {row.original.activo ? 'Activo' : 'Inactivo'}
      </span>
    ),
  },
];

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewUser, setShowNewUser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    nombre: '',
    email: '',
    password: '',
    iniciales: '',
    rol: 'operario' as string,
  });

  const load = () => {
    usuariosApi
      .list()
      .then((res) => {
        setUsers(res.data.data ?? []);
        setMeta(res.data.meta);
      })
      .catch(() => {
        setUsers(MOCK_USERS);
        setMeta({ total: MOCK_USERS.length, page: 1, per_page: 20, pages: 1 });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.nombre.trim() || !newUserForm.email.trim() || !newUserForm.password.trim()) {
      toast.error('Completá nombre, email y contraseña');
      return;
    }
    if (newUserForm.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      await usuariosApi.create({
        nombre: newUserForm.nombre.trim(),
        email: newUserForm.email.trim(),
        password: newUserForm.password,
        rol: newUserForm.rol,
        iniciales: newUserForm.iniciales.trim() || undefined,
      });
      toast.success('Usuario creado correctamente');
      setShowNewUser(false);
      setNewUserForm({ nombre: '', email: '', password: '', iniciales: '', rol: 'operario' });
      load();
    } catch {
      toast.error('Error al crear el usuario');
    } finally {
      setSaving(false);
    }
  };

  const filtered = search
    ? users.filter((u) => u.nombre.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="relative flex-1 min-w-44 max-w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar usuarios…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowNewUser(true)}>
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </Button>
        </div>
      </motion.div>

      <DataTable data={filtered} columns={columns} meta={meta} isLoading={loading} emptyMessage="No se encontraron usuarios" />

      <Dialog open={showNewUser} onOpenChange={setShowNewUser}>
        <DialogContent className="max-w-lg p-0">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">Nuevo usuario</h3>
          </div>
          <form onSubmit={handleCreateUser} className="px-6 py-5 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nombre *</label>
              <Input
                value={newUserForm.nombre}
                onChange={(e) => setNewUserForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre completo"
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email *</label>
              <Input
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="usuario@ejemplo.gob.ar"
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contraseña *</label>
              <Input
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="h-9 text-sm"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Iniciales</label>
              <Input
                value={newUserForm.iniciales}
                onChange={(e) => setNewUserForm((f) => ({ ...f, iniciales: e.target.value.toUpperCase().slice(0, 4) }))}
                placeholder="Ej: MG"
                className="h-9 text-sm max-w-[80px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Rol *</label>
              <Select value={newUserForm.rol} onValueChange={(v) => setNewUserForm((f) => ({ ...f, rol: v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" loading={saving}>
                Crear usuario
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const MOCK_USERS: User[] = [
  { id: 1, nombre: 'Sistema Admin', email: 'admin@pj.gob.ar', rol: 'admin', activo: true, iniciales: 'SA', avatarColor: '#DC2626' },
  { id: 2, nombre: 'María García', email: 'm.garcia@pj.gob.ar', rol: 'operario', activo: true, iniciales: 'MG', avatarColor: '#059669' },
  { id: 3, nombre: 'Lucas Fernández', email: 'l.fernandez@pj.gob.ar', rol: 'tecnico_interno', activo: true, iniciales: 'LF', avatarColor: '#7C3AED' },
  { id: 4, nombre: 'Pedro González', email: 'p.gonzalez@pj.gob.ar', rol: 'tecnico_interno', activo: true, iniciales: 'PG', avatarColor: '#2563EB' },
  { id: 5, nombre: 'Técnico HP', email: 'tecnico@hp.com', rol: 'tecnico_proveedor', activo: true, iniciales: 'TH', avatarColor: '#0891B2' },
];

