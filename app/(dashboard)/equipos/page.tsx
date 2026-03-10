'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, RefreshCw, Pencil } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { equiposApi } from '@/lib/api';
import type { Equipo, EquipoFilters, PaginationMeta } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { EquipoEstadoBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const ALL_FILTER = '__all__'; // Radix Select no permite value=""
const CLASES = [ALL_FILTER, 'Computadora', 'Impresora', 'Monitor', 'Scanner', 'Servidor', 'Red', 'UPS', 'Periferico', 'Otro'];
const ESTADOS_EQUIPO = [ALL_FILTER, 'Activo', 'Inactivo', 'En Mantenimiento', 'Dado de Baja'];

const ROLES_CAN_EDIT = ['admin', 'operario'];
const ROLES_TECNICOS = ['tecnico_interno', 'tecnico_proveedor'];

export default function EquiposPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.rol && ROLES_CAN_EDIT.includes(user.rol);
  const isTecnico = user?.rol && ROLES_TECNICOS.includes(user.rol);

  useEffect(() => {
    if (isTecnico) router.replace('/tickets');
  }, [isTecnico, router]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EquipoFilters>({ page: 1, per_page: 20 });
  const [search, setSearch] = useState('');
  const [editEquipo, setEditEquipo] = useState<Equipo | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ clase: '', subtipo: '', marca: '', modelo: '', estado: '', observaciones: '' });

  const load = useCallback(async (f: EquipoFilters) => {
    setLoading(true);
    try {
      const res = await equiposApi.list(f);
      setEquipos(res.data.data ?? []);
      setMeta(res.data.meta);
    } catch {
      setEquipos(MOCK_EQUIPOS);
      setMeta({ total: MOCK_EQUIPOS.length, page: 1, per_page: 20, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  const openEdit = (e: Equipo) => {
    setEditEquipo(e);
    setEditForm({
      clase: e.clase,
      subtipo: e.subtipo ?? '',
      marca: e.marca ?? '',
      modelo: e.modelo ?? '',
      estado: e.estado,
      observaciones: e.observaciones ?? '',
    });
  };

  const handleSaveEquipo = async () => {
    if (!editEquipo) return;
    setSaving(true);
    try {
      await equiposApi.update(editEquipo.id, {
        nro_inventario: editEquipo.nro_inventario,
        clase: editForm.clase,
        subtipo: editForm.subtipo || undefined,
        marca: editForm.marca || undefined,
        modelo: editForm.modelo || undefined,
        estado: editForm.estado,
        observaciones: editForm.observaciones || undefined,
      });
      toast.success('Equipo actualizado');
      setEditEquipo(null);
      load(filters);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<Equipo>[] = [
    {
      accessorKey: 'nro_inventario',
      header: 'Nro. Inventario',
      size: 130,
      cell: ({ row }) => <span className="font-mono text-xs font-medium text-foreground">{row.original.nro_inventario}</span>,
    },
    {
      accessorKey: 'clase',
      header: 'Clase / Subtipo',
      size: 140,
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.clase}</p>
          {row.original.subtipo && <p className="text-xs text-muted-foreground">{row.original.subtipo}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'marca',
      header: 'Marca / Modelo',
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-foreground">{row.original.marca ?? '—'}</p>
          {row.original.modelo && <p className="text-xs text-muted-foreground">{row.original.modelo}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      size: 150,
      cell: ({ row }) => <EquipoEstadoBadge estado={row.original.estado as never} />,
    },
    {
      accessorKey: 'puesto',
      header: 'Ubicación',
      cell: ({ row }) => {
        const p = row.original.puesto;
        return p ? (
          <div>
            <p className="text-sm text-foreground">{p.juzgado.nombre}</p>
            <p className="text-xs text-muted-foreground">Puesto {p.numero}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sin asignar</span>
        );
      },
    },
    {
      accessorKey: 'fecha_alta',
      header: 'Alta',
      size: 100,
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.fecha_alta ? formatDate(row.original.fecha_alta) : '—'}</span>,
    },
    ...(canEdit
      ? [
          {
            id: 'acciones',
            header: '',
            size: 60,
            cell: ({ row }: { row: { original: Equipo } }) => (
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
          } as ColumnDef<Equipo>,
        ]
      : []),
  ];

  if (isTecnico) return null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-44 max-w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar equipos…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setFilters((p) => ({ ...p, q: e.target.value || undefined, page: 1 }));
            }}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <Select value={filters.clase ?? ALL_FILTER} onValueChange={(v) => setFilters((p) => ({ ...p, clase: v === ALL_FILTER ? undefined : v, page: 1 }))}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Clase" />
          </SelectTrigger>
          <SelectContent>
            {CLASES.map((c) => (
              <SelectItem key={c} value={c}>
                {c === ALL_FILTER ? 'Todas las clases' : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.estado ?? ALL_FILTER} onValueChange={(v) => setFilters((p) => ({ ...p, estado: v === ALL_FILTER ? undefined : v, page: 1 }))}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS_EQUIPO.map((e) => (
              <SelectItem key={e} value={e}>
                {e === ALL_FILTER ? 'Todos los estados' : e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => load(filters)}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {meta && (
            <span className="text-xs text-muted-foreground">
              {meta.total} equipo{meta.total !== 1 ? 's' : ''}
            </span>
          )}
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Nuevo Equipo
          </Button>
        </div>
      </motion.div>

      <DataTable
        data={equipos}
        columns={columns}
        meta={meta}
        isLoading={loading}
        onPageChange={(page) => setFilters((p) => ({ ...p, page }))}
        emptyMessage="No se encontraron equipos"
      />

      <Dialog open={!!editEquipo} onOpenChange={(open) => !open && setEditEquipo(null)}>
        <DialogContent className="max-w-lg p-0">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">Editar equipo</h3>
            {editEquipo && <p className="text-sm text-muted-foreground font-mono mt-1">{editEquipo.nro_inventario}</p>}
          </div>
          {editEquipo && (
            <div className="px-6 py-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Clase</label>
                  <Select value={editForm.clase} onValueChange={(v) => setEditForm((f) => ({ ...f, clase: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASES.filter((c) => c !== ALL_FILTER).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Estado</label>
                  <Select value={editForm.estado} onValueChange={(v) => setEditForm((f) => ({ ...f, estado: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_EQUIPO.filter((e) => e !== ALL_FILTER).map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Marca</label>
                  <Input value={editForm.marca} onChange={(e) => setEditForm((f) => ({ ...f, marca: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Modelo</label>
                  <Input value={editForm.modelo} onChange={(e) => setEditForm((f) => ({ ...f, modelo: e.target.value }))} className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Subtipo</label>
                <Input value={editForm.subtipo} onChange={(e) => setEditForm((f) => ({ ...f, subtipo: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Observaciones</label>
                <Input value={editForm.observaciones} onChange={(e) => setEditForm((f) => ({ ...f, observaciones: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <DialogClose asChild>
                  <Button variant="outline" size="sm">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button size="sm" loading={saving} onClick={handleSaveEquipo}>
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

const MOCK_EQUIPOS: Equipo[] = [
  {
    id: 1,
    nro_inventario: 'INV-0001',
    clase: 'Computadora',
    subtipo: 'Desktop',
    marca: 'Dell',
    modelo: 'OptiPlex 7090',
    estado: 'Activo',
    activo: true,
    puesto: { id: 1, numero: '1', juzgado: { id: 1, nombre: 'Juzgado Civil 3' } },
    fecha_alta: '2022-03-15',
  },
  {
    id: 2,
    nro_inventario: 'INV-0002',
    clase: 'Impresora',
    subtipo: 'Laser',
    marca: 'HP',
    modelo: 'LaserJet Pro M404n',
    estado: 'Activo',
    activo: true,
    puesto: { id: 2, numero: '2', juzgado: { id: 1, nombre: 'Juzgado Civil 3' } },
  },
  {
    id: 3,
    nro_inventario: 'INV-0003',
    clase: 'Computadora',
    subtipo: 'Laptop',
    marca: 'Lenovo',
    modelo: 'ThinkPad E14',
    estado: 'En Mantenimiento',
    activo: true,
  },
  {
    id: 4,
    nro_inventario: 'INV-0004',
    clase: 'Monitor',
    marca: 'LG',
    modelo: '24" IPS',
    estado: 'Activo',
    activo: true,
    puesto: { id: 3, numero: '3', juzgado: { id: 2, nombre: 'Cámara Penal' } },
    fecha_alta: '2021-08-20',
  },
  { id: 5, nro_inventario: 'INV-0005', clase: 'Scanner', marca: 'Canon', modelo: 'DR-C225', estado: 'Inactivo', activo: true },
  {
    id: 6,
    nro_inventario: 'INV-0006',
    clase: 'Servidor',
    subtipo: 'Rack',
    marca: 'HP',
    modelo: 'ProLiant DL380',
    estado: 'Activo',
    activo: true,
    fecha_alta: '2020-01-10',
  },
];

