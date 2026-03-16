'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Shield, UserCheck, Wrench, Package, Pencil, Trash2 } from 'lucide-react';
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
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const ROLES_CAN_EDIT_USUARIOS = ['admin'];

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

function useColumnsWithActions(canEdit: boolean, onEdit: (u: User) => void, onDelete: (u: User) => void): ColumnDef<User>[] {
  if (!canEdit) return columns;
  return [
    ...columns,
    {
      id: 'acciones',
      header: '',
      size: 100,
      cell: ({ row }: { row: { original: User } }) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(row.original)}>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(row.original)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}

export default function UsuariosPage() {
  const user = useAuthStore((s) => s.user);
  const canEdit = Boolean(user?.rol && ROLES_CAN_EDIT_USUARIOS.includes(user.rol));
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [userForm, setUserForm] = useState({
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

  const openNewUser = () => {
    setEditUser(null);
    setUserForm({ nombre: '', email: '', password: '', iniciales: '', rol: 'operario' });
    setShowModal(true);
  };

  const openEditUser = (u: User) => {
    setEditUser(u);
    setUserForm({
      nombre: u.nombre,
      email: u.email,
      password: '',
      iniciales: u.iniciales ?? '',
      rol: u.rol,
    });
    setShowModal(true);
  };

  const handleDeleteUser = async (u: User) => {
    if (!window.confirm(`¿Dar de baja al usuario "${u.nombre}"? (soft delete)`)) return;
    try {
      await usuariosApi.delete(u.id);
      toast.success('Usuario dado de baja');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Error al eliminar');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.nombre.trim() || !userForm.email.trim()) {
      toast.error('Nombre y email son obligatorios');
      return;
    }
    if (!editUser && !userForm.password.trim()) {
      toast.error('La contraseña es obligatoria para nuevo usuario');
      return;
    }
    if (userForm.password && userForm.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      if (editUser) {
        await usuariosApi.update(editUser.id, {
          nombre: userForm.nombre.trim(),
          email: userForm.email.trim(),
          rol: userForm.rol,
          iniciales: userForm.iniciales.trim() || undefined,
          ...(userForm.password.trim() ? { password: userForm.password } : {}),
        });
        toast.success('Usuario actualizado');
      } else {
        await usuariosApi.create({
          nombre: userForm.nombre.trim(),
          email: userForm.email.trim(),
          password: userForm.password,
          rol: userForm.rol,
          iniciales: userForm.iniciales.trim() || undefined,
        });
        toast.success('Usuario creado correctamente');
      }
      setShowModal(false);
      setEditUser(null);
      setUserForm({ nombre: '', email: '', password: '', iniciales: '', rol: 'operario' });
      load();
    } catch {
      toast.error(editUser ? 'Error al actualizar' : 'Error al crear el usuario');
    } finally {
      setSaving(false);
    }
  };

  const columnsToShow = useColumnsWithActions(canEdit, openEditUser, handleDeleteUser);

  const filtered = search
    ? users.filter((u) => u.nombre.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 w-full">
        <div className="relative flex-1 min-w-44 max-w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar usuarios…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <div className="ml-auto">
          {canEdit && (
            <Button size="sm" onClick={openNewUser}>
              <Plus className="w-4 h-4" /> Nuevo Usuario
            </Button>
          )}
        </div>
      </motion.div>

      <DataTable data={filtered} columns={columnsToShow} meta={meta} isLoading={loading} emptyMessage="No se encontraron usuarios" />

      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
          setShowModal(open);
        }}
      >
        <DialogContent className="max-w-lg p-0">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">{editUser ? 'Editar usuario' : 'Nuevo usuario'}</h3>
          </div>
          <form onSubmit={handleSaveUser} className="px-6 py-5 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nombre *</label>
              <Input
                value={userForm.nombre}
                onChange={(e) => setUserForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre completo"
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email *</label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="usuario@ejemplo.gob.ar"
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{editUser ? 'Nueva contraseña (dejar en blanco para no cambiar)' : 'Contraseña *'}</label>
              <Input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editUser ? 'Opcional' : 'Mínimo 6 caracteres'}
                className="h-9 text-sm"
                minLength={editUser ? undefined : 6}
                required={!editUser}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Iniciales</label>
              <Input
                value={userForm.iniciales}
                onChange={(e) => setUserForm((f) => ({ ...f, iniciales: e.target.value.toUpperCase().slice(0, 4) }))}
                placeholder="Ej: MG"
                className="h-9 text-sm max-w-[80px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Rol *</label>
              <Select value={userForm.rol} onValueChange={(v) => setUserForm((f) => ({ ...f, rol: v }))}>
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
                {editUser ? 'Guardar' : 'Crear usuario'}
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

