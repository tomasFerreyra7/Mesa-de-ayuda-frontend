'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { equiposApi, ubicacionesApi } from '@/lib/api';
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
  const [creatingEquipo, setCreatingEquipo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [puestosOptions, setPuestosOptions] = useState<{ id: number; label: string }[]>([]);
  const [loadingPuestos, setLoadingPuestos] = useState(false);
  const [editForm, setEditForm] = useState({
    nro_inventario: '',
    clase: '',
    subtipo: '',
    marca: '',
    modelo: '',
    nro_serie: '',
    estado: '',
    puesto_id: '' as string,
    fecha_alta: '',
    observaciones: '',
  });

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

  // Cargar puestos (juzgado + número) para el Select al abrir el modal de crear/editar
  useEffect(() => {
    if (!editEquipo && !creatingEquipo) return;
    setLoadingPuestos(true);
    ubicacionesApi
      .juzgados()
      .then((jRes) => {
        const raw = jRes.data as { data?: unknown[]; [k: string]: unknown };
        const juzgados = (raw?.data ?? raw) as { id: number; nombre?: string; codigo?: string }[];
        if (!Array.isArray(juzgados) || juzgados.length === 0) {
          setPuestosOptions([]);
          return;
        }
        return Promise.all(
          juzgados.map((j) =>
            ubicacionesApi.puestos(j.id).then((pRes) => {
              const pr = pRes.data as { data?: unknown[]; [k: string]: unknown };
              const puestos = (pr?.data ?? pr) as { id: number; numero?: number | string; descripcion?: string }[];
              const nombreJuzgado = j.nombre ?? j.codigo ?? `Juzgado ${j.id}`;
              return (Array.isArray(puestos) ? puestos : []).map((p) => ({
                id: p.id,
                label: `${nombreJuzgado} — Puesto ${p.numero ?? p.id}`,
              }));
            }),
          ),
        );
      })
      .then((arrays) => {
        if (!arrays) return;
        setPuestosOptions(arrays.flat());
      })
      .catch(() => setPuestosOptions([]))
      .finally(() => setLoadingPuestos(false));
  }, [editEquipo, creatingEquipo]);

  const openEdit = (e: Equipo) => {
    setEditEquipo(e);
    setCreatingEquipo(false);
    setEditForm({
      nro_inventario: e.nro_inventario ?? e.nroInventario ?? '',
      clase: e.clase,
      subtipo: e.subtipo ?? '',
      marca: e.marca ?? '',
      modelo: e.modelo ?? '',
      nro_serie: e.nro_serie ?? e.nroSerie ?? '',
      estado: e.estado,
      puesto_id: e.puesto?.id != null ? String(e.puesto.id) : '',
      fecha_alta: e.fecha_alta ?? e.fechaAlta ?? '',
      observaciones: e.observaciones ?? '',
    });
  };

  const handleSaveEquipo = async () => {
    if (!creatingEquipo && !editEquipo) return;

    if (!editForm.nro_inventario || !editForm.clase) {
      toast.error('Nro. inventario y clase son obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (creatingEquipo) {
        const createPayload = {
          nro_inventario: editForm.nro_inventario,
          clase: editForm.clase,
          subtipo: editForm.subtipo || undefined,
          marca: editForm.marca || undefined,
          modelo: editForm.modelo || undefined,
          nro_serie: editForm.nro_serie || undefined,
          estado: editForm.estado || 'Activo',
          puesto_id: editForm.puesto_id !== '' ? Number(editForm.puesto_id) : undefined,
          fecha_alta: editForm.fecha_alta || undefined,
          observaciones: editForm.observaciones || undefined,
        };
        await equiposApi.create(createPayload);
        toast.success('Equipo creado');
      } else if (editEquipo) {
        // PATCH no debe enviar nro_inventario ni fecha_alta (el backend no los permite en update)
        const updatePayload = {
          clase: editForm.clase,
          subtipo: editForm.subtipo || undefined,
          marca: editForm.marca || undefined,
          modelo: editForm.modelo || undefined,
          nro_serie: editForm.nro_serie || undefined,
          estado: editForm.estado || undefined,
          puesto_id: editForm.puesto_id !== '' ? Number(editForm.puesto_id) : undefined,
          observaciones: editForm.observaciones || undefined,
        };
        await equiposApi.update(editEquipo.id, updatePayload);
        toast.success('Equipo actualizado');
      }
      setEditEquipo(null);
      setCreatingEquipo(false);
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
      cell: ({ row }) => {
        const e = row.original;
        const nro = e.nro_inventario ?? e.nroInventario;
        return <span className="font-mono text-xs text-muted-foreground">{nro ?? '—'}</span>;
      },
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
      cell: ({ row }) => {
        const e = row.original;
        const fecha = e.fecha_alta ?? e.fechaAlta;
        return <span className="text-xs text-muted-foreground">{fecha ? formatDate(fecha) : '—'}</span>;
      },
    },
    ...(canEdit
      ? [
          {
            id: 'acciones',
            header: '',
            size: 100,
            cell: ({ row }: { row: { original: Equipo } }) => (
              <div className="flex items-center gap-0.5">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm('¿Dar de baja este equipo? (soft delete)')) return;
                    try {
                      await equiposApi.delete(row.original.id);
                      toast.success('Equipo dado de baja');
                      load(filters);
                    } catch {
                      toast.error('Error al eliminar');
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ),
          } as ColumnDef<Equipo>,
        ]
      : []),
  ];

  if (isTecnico) return null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3 w-full">
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
          <Button
            size="sm"
            onClick={() => {
              setCreatingEquipo(true);
              setEditEquipo(null);
              setEditForm({
                nro_inventario: '',
                clase: '',
                subtipo: '',
                marca: '',
                modelo: '',
                nro_serie: '',
                estado: 'Activo',
                puesto_id: '',
                fecha_alta: '',
                observaciones: '',
              });
            }}
          >
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

      <Dialog
        open={!!editEquipo || creatingEquipo}
        onOpenChange={(open) => {
          if (!open) {
            setEditEquipo(null);
            setCreatingEquipo(false);
          }
        }}
      >
        <DialogContent className="max-w-lg p-0">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">{creatingEquipo ? 'Nuevo equipo' : 'Editar equipo'}</h3>
          </div>
          {(editEquipo || creatingEquipo) && (
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Nro. Inventario <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={editForm.nro_inventario}
                    onChange={(e) => setEditForm((f) => ({ ...f, nro_inventario: e.target.value }))}
                    className="h-9 text-sm font-mono"
                    placeholder="Texto"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nro. serie</label>
                  <Input
                    value={editForm.nro_serie}
                    onChange={(e) => setEditForm((f) => ({ ...f, nro_serie: e.target.value }))}
                    className="h-9 text-sm font-mono"
                    placeholder="Texto"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Clase <span className="text-destructive">*</span>
                  </label>
                  <Select value={editForm.clase} onValueChange={(v) => setEditForm((f) => ({ ...f, clase: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Seleccionar" />
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
                  <Input
                    value={editForm.marca}
                    onChange={(e) => setEditForm((f) => ({ ...f, marca: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Texto"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Modelo</label>
                  <Input
                    value={editForm.modelo}
                    onChange={(e) => setEditForm((f) => ({ ...f, modelo: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Texto"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Subtipo</label>
                  <Input
                    value={editForm.subtipo}
                    onChange={(e) => setEditForm((f) => ({ ...f, subtipo: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Texto"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Puesto</label>
                  <Select
                    value={editForm.puesto_id || '__none__'}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, puesto_id: v === '__none__' ? '' : v }))}
                    disabled={loadingPuestos}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={loadingPuestos ? 'Cargando puestos…' : 'Sin asignar'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin asignar</SelectItem>
                      {puestosOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Fecha alta</label>
                <Input
                  type="date"
                  value={editForm.fecha_alta}
                  onChange={(e) => setEditForm((f) => ({ ...f, fecha_alta: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Observaciones</label>
                <Input
                  value={editForm.observaciones}
                  onChange={(e) => setEditForm((f) => ({ ...f, observaciones: e.target.value }))}
                  className="h-9 text-sm"
                  placeholder="Texto"
                />
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

