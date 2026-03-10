'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, RefreshCw, AlertCircle, Pencil } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { softwareApi } from '@/lib/api';
import type { Software, PaginationMeta } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { formatDate, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const ROLES_CAN_EDIT = ['admin', 'operario'];
const ROLES_TECNICOS = ['tecnico_interno', 'tecnico_proveedor'];

const softwareEstadoStyle: Record<string, string> = {
  Activo: 'bg-success-light text-success border-success/20',
  'Por Vencer': 'bg-warning-light text-warning border-warning/20',
  Vencido: 'bg-danger-light text-danger border-danger/20',
  'Sin Licencia': 'bg-secondary text-muted-foreground border-border',
  'Dado de Baja': 'bg-secondary text-muted-foreground border-border',
};

const columns: ColumnDef<Software>[] = [
  {
    accessorKey: 'nro_sw',
    header: 'Código',
    size: 100,
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.nro_sw ?? '—'}</span>,
  },
  {
    accessorKey: 'nombre',
    header: 'Software',
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium text-foreground">{row.original.nombre}</p>
        {row.original.version && <p className="text-xs text-muted-foreground">v{row.original.version}</p>}
      </div>
    ),
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    size: 160,
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.tipo}</span>,
  },
  {
    accessorKey: 'tipo_licencia',
    header: 'Licencia',
    size: 120,
    cell: ({ row }) => <span className="text-xs text-foreground">{row.original.tipo_licencia ?? '—'}</span>,
  },
  {
    accessorKey: 'instalaciones',
    header: 'Instalaciones',
    size: 120,
    cell: ({ row }) => {
      const actual = row.original.instalaciones_actuales ?? 0;
      const max = row.original.max_instalaciones;
      const atLimit = max != null && actual >= max;
      return (
        <span className={cn('text-sm', atLimit && 'text-warning font-semibold')}>
          {actual}
          {max != null ? `/${max}` : ''}
          {atLimit && <AlertCircle className="inline w-3 h-3 ml-1" />}
        </span>
      );
    },
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    size: 120,
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex px-2 py-0.5 rounded-md text-xs font-medium border',
          softwareEstadoStyle[row.original.estado] ?? 'bg-secondary text-muted-foreground border-border',
        )}
      >
        {row.original.estado}
      </span>
    ),
  },
  {
    accessorKey: 'fecha_vencimiento',
    header: 'Vencimiento',
    size: 110,
    cell: ({ row }) => (
      <span
        className={cn(
          'text-xs',
          row.original.estado === 'Por Vencer'
            ? 'text-warning font-medium'
            : row.original.estado === 'Vencido'
              ? 'text-danger font-medium'
              : 'text-muted-foreground',
        )}
      >
        {row.original.fecha_vencimiento ? formatDate(row.original.fecha_vencimiento) : '—'}
      </span>
    ),
  },
];

export default function SoftwarePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.rol && ROLES_CAN_EDIT.includes(user.rol);
  const isTecnico = user?.rol && ROLES_TECNICOS.includes(user.rol);
  const [software, setSoftware] = useState<Software[]>([]);

  useEffect(() => {
    if (isTecnico) router.replace('/tickets');
  }, [isTecnico, router]);
  const [meta, setMeta] = useState<PaginationMeta>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<Software | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ nombre: '', version: '', tipo: '', nro_sw: '', fecha_vencimiento: '' });

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await softwareApi.list({ q, page: 1, per_page: 20 });
      setSoftware(res.data.data ?? []);
      setMeta(res.data.meta);
    } catch {
      setSoftware(MOCK_SOFTWARE);
      setMeta({ total: MOCK_SOFTWARE.length, page: 1, per_page: 20, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (s: Software) => {
    setEditItem(s);
    setEditForm({
      nombre: s.nombre,
      version: s.version ?? '',
      tipo: s.tipo,
      nro_sw: s.nro_sw ?? '',
      fecha_vencimiento: s.fecha_vencimiento ?? '',
    });
  };

  const handleSaveSoftware = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await softwareApi.update(editItem.id, {
        nombre: editForm.nombre,
        version: editForm.version || undefined,
        tipo: editForm.tipo,
        nro_sw: editForm.nro_sw || undefined,
        fecha_vencimiento: editForm.fecha_vencimiento || undefined,
      });
      toast.success('Software actualizado');
      setEditItem(null);
      load(search);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const columnsWithEdit: ColumnDef<Software>[] = [
    ...columns,
    ...(canEdit
      ? [
          {
            id: 'acciones',
            header: '',
            size: 60,
            cell: ({ row }: { row: { original: Software } }) => (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(row.original);
                }}
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            ),
          } as ColumnDef<Software>,
        ]
      : []),
  ];

  if (isTecnico) return null;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-44 max-w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar software…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              load(e.target.value);
            }}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => load(search)}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {meta && (
            <span className="text-xs text-muted-foreground">
              {meta.total} registro{meta.total !== 1 ? 's' : ''}
            </span>
          )}
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Nuevo Software
          </Button>
        </div>
      </motion.div>

      <DataTable data={software} columns={columnsWithEdit} meta={meta} isLoading={loading} emptyMessage="No se encontró software registrado" />

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="max-w-lg p-0">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">Editar software</h3>
          </div>
          {editItem && (
            <div className="px-6 py-5 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nombre</label>
                <Input value={editForm.nombre} onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Versión</label>
                  <Input value={editForm.version} onChange={(e) => setEditForm((f) => ({ ...f, version: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Código</label>
                  <Input value={editForm.nro_sw} onChange={(e) => setEditForm((f) => ({ ...f, nro_sw: e.target.value }))} className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tipo</label>
                <Input value={editForm.tipo} onChange={(e) => setEditForm((f) => ({ ...f, tipo: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Fecha vencimiento</label>
                <Input
                  type="date"
                  value={editForm.fecha_vencimiento}
                  onChange={(e) => setEditForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <DialogClose asChild>
                  <Button variant="outline" size="sm">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button size="sm" loading={saving} onClick={handleSaveSoftware}>
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const MOCK_SOFTWARE: Software[] = [
  {
    id: 1,
    nro_sw: 'SW-001',
    nombre: 'Microsoft Office 365',
    version: '2021',
    tipo: 'Ofimatica',
    tipo_licencia: 'Volumen',
    max_instalaciones: 50,
    instalaciones_actuales: 47,
    estado: 'Por Vencer',
    fecha_vencimiento: '2024-12-31',
    activo: true,
  },
  {
    id: 2,
    nro_sw: 'SW-002',
    nombre: 'Kaspersky Endpoint Security',
    version: '12.1',
    tipo: 'Seguridad',
    tipo_licencia: 'Suscripcion',
    max_instalaciones: 100,
    instalaciones_actuales: 86,
    estado: 'Activo',
    fecha_vencimiento: '2025-06-15',
    activo: true,
  },
  {
    id: 3,
    nro_sw: 'SW-003',
    nombre: 'Sistema de Gestión Judicial',
    version: '3.4.2',
    tipo: 'Gestion Judicial',
    tipo_licencia: 'Otro',
    estado: 'Activo',
    activo: true,
  },
  {
    id: 4,
    nro_sw: 'SW-004',
    nombre: 'Adobe Acrobat Pro',
    version: '2023',
    tipo: 'Utilidades',
    tipo_licencia: 'Suscripcion',
    max_instalaciones: 10,
    instalaciones_actuales: 10,
    estado: 'Activo',
    fecha_vencimiento: '2025-03-01',
    activo: true,
  },
  { id: 5, nro_sw: 'SW-005', nombre: 'Windows 11 Pro', tipo: 'Sistema Operativo', tipo_licencia: 'OEM', estado: 'Activo', activo: true },
];

