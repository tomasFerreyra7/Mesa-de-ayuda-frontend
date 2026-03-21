'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Shield, UserCheck, Wrench, Package, Pencil, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { usuariosApi, ubicacionesApi } from '@/lib/api';
import type { User, PaginationMeta } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getInitials, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import { normalizeUserFromApi } from '@/lib/normalize-user';

const ROLES_CAN_EDIT_USUARIOS = ['admin'];

const ROLES_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'operario', label: 'Operario' },
  { value: 'tecnico_interno', label: 'Técnico Interno' },
  { value: 'tecnico_proveedor', label: 'Técnico Proveedor' },
] as const;

/** Colores de avatar alineados con la vista en tabla */
const AVATAR_COLOR_PRESETS = ['#2563EB', '#DC2626', '#059669', '#7C3AED', '#0891B2', '#EA580C', '#4F46E5', '#BE185D'] as const;

type UserFormState = {
  nombre: string;
  email: string;
  password: string;
  iniciales: string;
  rol: string;
  juzgado_id: string;
  avatarColor: string;
  activo: boolean;
};

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
    id: 'juzgado',
    header: 'Juzgado',
    size: 220,
    cell: ({ row }) => {
      const u = row.original;
      const label = u.juzgado?.nombre;
      if (label) {
        return <span className="text-sm text-foreground line-clamp-2">{label}</span>;
      }
      const jid = u.juzgado_id ?? u.juzgadoIds?.[0];
      if (jid != null && !Number.isNaN(Number(jid))) {
        return <span className="text-sm text-muted-foreground">Juzgado #{jid}</span>;
      }
      return <span className="text-sm text-muted-foreground">—</span>;
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
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [juzgadosOptions, setJuzgadosOptions] = useState<{ id: number; nombre: string }[]>([]);
  const [userForm, setUserForm] = useState<UserFormState>({
    nombre: '',
    email: '',
    password: '',
    iniciales: '',
    rol: 'operario',
    juzgado_id: '',
    avatarColor: AVATAR_COLOR_PRESETS[0],
    activo: true,
  });

  useEffect(() => {
    if (!canEdit) return;
    ubicacionesApi
      .juzgados()
      .then((res) => setJuzgadosOptions(res.data.data ?? []))
      .catch(() => setJuzgadosOptions([]));
  }, [canEdit]);

  const load = () => {
    usuariosApi
      .list()
      .then((res) => {
        setUsers(res.data.data ?? []);
        setMeta(res.data.meta);
      })
      .catch(() => {
        setUsers([]);
        setMeta(undefined);
        toast.error('No se pudieron cargar los usuarios');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const applyUserToForm = (full: User) => {
    const jid = full.juzgado_id ?? full.juzgado?.id ?? full.juzgadoIds?.[0];
    const color = (full.avatarColor as string) || AVATAR_COLOR_PRESETS[0];
    setUserForm({
      nombre: full.nombre,
      email: full.email,
      password: '',
      iniciales: full.iniciales ?? '',
      rol: full.rol,
      juzgado_id: jid != null && !Number.isNaN(Number(jid)) ? String(jid) : '',
      avatarColor: color,
      activo: full.activo !== false,
    });
    if (full.juzgado?.id != null) {
      setJuzgadosOptions((prev) =>
        prev.some((j) => j.id === full.juzgado!.id) ? prev : [...prev, { id: full.juzgado!.id, nombre: full.juzgado!.nombre }],
      );
    }
  };

  const openNewUser = () => {
    setEditUser(null);
    setUserForm({ nombre: '', email: '', password: '', iniciales: '', rol: 'operario', juzgado_id: '', avatarColor: AVATAR_COLOR_PRESETS[0], activo: true });
    setShowModal(true);
  };

  const openEditUser = (u: User) => {
    setEditUser(u);
    setShowModal(true);
    setLoadingUserDetail(true);
    usuariosApi
      .get(u.id)
      .then((res) => {
        const payload = (res.data as { data?: unknown })?.data ?? res.data;
        const inner = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
        const rawObj = (inner?.usuario ?? inner?.user ?? inner) as Record<string, unknown> | null;
        if (rawObj && rawObj.id != null) {
          const full = normalizeUserFromApi(rawObj);
          setEditUser(full);
          applyUserToForm(full);
          return;
        }
        applyUserToForm(u);
      })
      .catch(() => {
        toast.error('No se pudieron cargar los datos completos; mostrando fila de la lista.');
        applyUserToForm(u);
      })
      .finally(() => setLoadingUserDetail(false));
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
    if (userForm.rol === 'operario' && !userForm.juzgado_id) {
      toast.error('Los operarios deben tener un juzgado asignado');
      return;
    }
    setSaving(true);
    try {
      /** Operario: siempre un juzgado. Otros roles: opcional; al editar, vacío envía [] para limpiar en el backend. */
      const juzgadoPayload =
        userForm.rol === 'operario'
          ? { juzgadoIds: [Number(userForm.juzgado_id)] }
          : userForm.juzgado_id
            ? { juzgadoIds: [Number(userForm.juzgado_id)] }
            : editUser
              ? { juzgadoIds: [] as number[] }
              : {};
      const colorPayload = userForm.avatarColor?.trim() ? { avatarColor: userForm.avatarColor.trim() } : {};
      const activoPayload = { activo: userForm.activo };
      if (editUser) {
        await usuariosApi.update(editUser.id, {
          nombre: userForm.nombre.trim(),
          email: userForm.email.trim(),
          rol: userForm.rol,
          iniciales: userForm.iniciales.trim() || undefined,
          ...(userForm.password.trim() ? { password: userForm.password } : {}),
          ...juzgadoPayload,
          ...colorPayload,
          ...activoPayload,
        });
        toast.success('Usuario actualizado');
      } else {
        await usuariosApi.create({
          nombre: userForm.nombre.trim(),
          email: userForm.email.trim(),
          password: userForm.password,
          rol: userForm.rol,
          iniciales: userForm.iniciales.trim() || undefined,
          ...juzgadoPayload,
          ...colorPayload,
          ...activoPayload,
        });
        toast.success('Usuario creado correctamente');
      }
      setShowModal(false);
      setEditUser(null);
      setUserForm({ nombre: '', email: '', password: '', iniciales: '', rol: 'operario', juzgado_id: '', avatarColor: AVATAR_COLOR_PRESETS[0], activo: true });
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
          <form onSubmit={handleSaveUser} className={cn('px-6 py-5 space-y-5 relative', loadingUserDetail && 'pointer-events-none opacity-60')}>
            {loadingUserDetail && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 rounded-b-lg">
                <p className="text-sm text-muted-foreground">Cargando datos del usuario…</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nombre <span className="text-destructive">*</span>
              </label>
              <Input
                value={userForm.nombre}
                onChange={(e) => setUserForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre completo"
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email <span className="text-destructive">*</span>
              </label>
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
              <label className="text-sm font-medium text-foreground">
                {editUser ? (
                  'Nueva contraseña (dejar en blanco para no cambiar)'
                ) : (
                  <>
                    Contraseña <span className="text-destructive">*</span>
                  </>
                )}
              </label>
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
              <label className="text-sm font-medium text-foreground">Color de avatar</label>
              <p className="text-xs text-muted-foreground mb-2">Mismo criterio que el círculo en la columna Usuario de la tabla.</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => setUserForm((f) => ({ ...f, avatarColor: c }))}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                      userForm.avatarColor === c ? 'border-foreground ring-2 ring-ring ring-offset-2' : 'border-transparent',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Estado <span className="text-destructive">*</span>
              </label>
              <Select value={userForm.activo ? 'activo' : 'inactivo'} onValueChange={(v) => setUserForm((f) => ({ ...f, activo: v === 'activo' }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Rol <span className="text-destructive">*</span>
              </label>
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Juzgado {userForm.rol === 'operario' && <span className="text-destructive">*</span>}
                {userForm.rol !== 'operario' && <span className="text-muted-foreground font-normal"> (opcional)</span>}
              </label>
              <p className="text-xs text-muted-foreground">
                {userForm.rol === 'operario'
                  ? 'Cada operario debe pertenecer a un juzgado.'
                  : 'Podés vincular al usuario a un juzgado concreto o dejarlo sin asignar.'}
              </p>
              <Select value={userForm.juzgado_id || '__none__'} onValueChange={(v) => setUserForm((f) => ({ ...f, juzgado_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Seleccionar juzgado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{userForm.rol === 'operario' ? 'Seleccionar juzgado' : 'Sin juzgado asignado'}</SelectItem>
                  {juzgadosOptions.map((j) => (
                    <SelectItem key={j.id} value={String(j.id)}>
                      {j.nombre}
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

