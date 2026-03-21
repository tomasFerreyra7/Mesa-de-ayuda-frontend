'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { contratosApi, proveedoresApi } from '@/lib/api';
import type { Contrato, PaginationMeta, Proveedor } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatMoney, truncate, cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const ROLES_CAN_EDIT = ['admin', 'operario'];
const ROLES_TECNICOS = ['tecnico_interno', 'tecnico_proveedor'];

const estadoContratoStyle: Record<string, string> = {
  Vigente: 'bg-success-light text-success border-success/20',
  'Por Vencer': 'bg-warning-light text-warning border-warning/20',
  Vencido: 'bg-danger-light text-danger border-danger/20',
  Rescindido: 'bg-secondary text-muted-foreground border-border',
  'En Renovacion': 'bg-info-light text-info border-info/20',
};

const ESTADOS_CONTRATO = ['Vigente', 'Por Vencer', 'Vencido', 'Rescindido', 'En Renovacion'] as const;

const TIPOS_CONTRATO = ['Mantenimiento HW', 'Soporte SW', 'Conectividad', 'Seguridad IT', 'Consultoria', 'Otro'] as const;

const MONEDAS = [
  { value: 'ARS', label: 'ARS — Peso argentino' },
  { value: 'USD', label: 'USD — Dólar estadounidense' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'UYU', label: 'UYU — Peso uruguayo' },
  { value: 'BRL', label: 'BRL — Real brasileño' },
] as const;

const columns: ColumnDef<Contrato>[] = [
  {
    accessorKey: 'nro_contrato',
    header: 'Nro. Contrato',
    size: 130,
    cell: ({ row }) => {
      const c = row.original;
      const nro = c.nro_contrato ?? c.nroContrato;
      return <span className="font-mono text-xs text-muted-foreground">{nro ?? '—'}</span>;
    },
  },
  {
    accessorKey: 'proveedor',
    header: 'Proveedor',
    cell: ({ row }) => <p className="text-sm text-foreground font-medium">{row.original.proveedor?.nombre ?? '—'}</p>,
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    size: 160,
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.tipo}</span>,
  },
  {
    accessorKey: 'fecha_venc',
    header: 'Vencimiento',
    size: 150,
    cell: ({ row }) => {
      const c = row.original;
      const fechaVenc = c.fecha_venc ?? c.fechaVenc;
      if (!fechaVenc) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      const days = differenceInDays(parseISO(fechaVenc), new Date());
      return (
        <div>
          <p className={cn('text-sm font-medium', days < 0 ? 'text-danger' : days <= 30 ? 'text-warning' : 'text-foreground')}>{formatDate(fechaVenc)}</p>
          <p className={cn('text-[10px]', days < 0 ? 'text-danger' : days <= 30 ? 'text-warning' : 'text-muted-foreground')}>
            {days < 0 ? `Vencido hace ${Math.abs(days)}d` : days === 0 ? 'Vence hoy' : `En ${days} días`}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: 'monto',
    header: 'Monto',
    size: 130,
    cell: ({ row }) => (
      <span className="text-sm font-mono text-foreground">{row.original.monto ? formatMoney(row.original.monto, row.original.moneda ?? 'ARS') : '—'}</span>
    ),
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    size: 130,
    cell: ({ row }) => (
      <span
        className={cn('inline-flex px-2 py-0.5 rounded-md text-xs font-medium border', estadoContratoStyle[row.original.estado] ?? estadoContratoStyle.Vigente)}
      >
        {row.original.estado}
      </span>
    ),
  },
  {
    accessorKey: 'observaciones',
    header: 'Observaciones',
    size: 160,
    cell: ({ row }) => {
      const obs = (row.original as { observaciones?: string }).observaciones?.trim();
      if (!obs) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <span className="text-xs text-muted-foreground block max-w-[160px] truncate" title={obs}>
          {truncate(obs, 45)}
        </span>
      );
    },
  },
];

export default function ContratosPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.rol && ROLES_CAN_EDIT.includes(user.rol);
  const isTecnico = user?.rol && ROLES_TECNICOS.includes(user.rol);
  const [contratos, setContratos] = useState<Contrato[]>([]);

  useEffect(() => {
    if (isTecnico) router.replace('/tickets');
  }, [isTecnico, router]);
  const [meta, setMeta] = useState<PaginationMeta>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<Contrato | null>(null);
  const [creatingContrato, setCreatingContrato] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    nro_contrato: '',
    proveedor_id: '',
    tipo: 'Mantenimiento HW',
    descripcion: '',
    fecha_inicio: '',
    fecha_venc: '',
    estado: 'Vigente',
    monto: '',
    moneda: 'ARS',
    observaciones: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contratosApi.list();
      setContratos(res.data.data ?? []);
      setMeta(res.data.meta);
    } catch {
      setContratos(MOCK_CONTRATOS);
      setMeta({ total: MOCK_CONTRATOS.length, page: 1, per_page: 20, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadProveedores = useCallback(async () => {
    try {
      const res = await proveedoresApi.list();
      setProveedores(res.data?.data ?? res.data ?? []);
    } catch {
      setProveedores([]);
    }
  }, []);

  useEffect(() => {
    if (creatingContrato && proveedores.length === 0) loadProveedores();
  }, [creatingContrato, proveedores.length, loadProveedores]);

  const filtered = search
    ? contratos.filter((c) => {
        const nro = c.nro_contrato ?? c.nroContrato ?? '';
        return (
          nro.toLowerCase().includes(search.toLowerCase()) ||
          c.proveedor?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
          (c.tipo ?? '').toLowerCase().includes(search.toLowerCase())
        );
      })
    : contratos;

  const openEdit = (c: Contrato) => {
    setEditItem(c);
    setCreatingContrato(false);
    setEditForm({
      nro_contrato: c.nro_contrato ?? c.nroContrato ?? '',
      proveedor_id: c.proveedor?.id != null ? String(c.proveedor.id) : '',
      tipo: c.tipo ?? '',
      descripcion: c.descripcion ?? '',
      fecha_inicio: c.fecha_inicio ?? (c as { fechaInicio?: string }).fechaInicio ?? '',
      fecha_venc: c.fecha_venc ?? c.fechaVenc ?? '',
      estado: c.estado ?? 'Vigente',
      monto: c.monto != null ? String(c.monto) : '',
      moneda: c.moneda ?? 'ARS',
      observaciones: (c as { observaciones?: string }).observaciones ?? '',
    });
  };

  const handleSaveContrato = async () => {
    if (creatingContrato) {
      if (!editForm.nro_contrato.trim() || !editForm.proveedor_id || !editForm.tipo.trim() || !editForm.fecha_inicio || !editForm.fecha_venc) {
        toast.error('Nro. contrato, proveedor, tipo, fecha inicio y fecha venc. son obligatorios');
        return;
      }
      setSaving(true);
      try {
        await contratosApi.create({
          nro_contrato: editForm.nro_contrato.trim(),
          proveedor_id: Number(editForm.proveedor_id),
          tipo: editForm.tipo.trim(),
          descripcion: editForm.descripcion?.trim() || undefined,
          fecha_inicio: editForm.fecha_inicio,
          fecha_venc: editForm.fecha_venc,
          monto: editForm.monto ? Number(editForm.monto) : undefined,
          moneda: editForm.moneda || 'ARS',
          observaciones: editForm.observaciones?.trim() || undefined,
        });
        toast.success('Contrato creado');
        setCreatingContrato(false);
        load();
      } catch {
        toast.error('Error al guardar');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!editItem) return;
    setSaving(true);
    try {
      // PATCH: solo campos editables (no nro_contrato, proveedor_id, tipo, fecha_inicio, moneda)
      await contratosApi.update(editItem.id, {
        descripcion: editForm.descripcion?.trim() || undefined,
        fecha_venc: editForm.fecha_venc || undefined,
        estado: editForm.estado || undefined,
        monto: editForm.monto ? Number(editForm.monto) : undefined,
        observaciones: editForm.observaciones?.trim() || undefined,
      });
      toast.success('Contrato actualizado');
      setEditItem(null);
      load();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContrato = async (c: Contrato) => {
    const nro = c.nro_contrato ?? c.nroContrato ?? c.id;
    if (!window.confirm(`¿Eliminar el contrato ${nro}?`)) return;
    try {
      await contratosApi.delete(c.id);
      toast.success('Contrato eliminado');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Error al eliminar');
    }
  };

  const columnsWithEdit: ColumnDef<Contrato>[] = [
    ...columns,
    ...(canEdit
      ? [
          {
            id: 'acciones',
            header: '',
            size: 100,
            cell: ({ row }: { row: { original: Contrato } }) => (
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteContrato(row.original);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ),
          } as ColumnDef<Contrato>,
        ]
      : []),
  ];

  if (isTecnico) return null;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3 w-full">
        <div className="relative flex-1 min-w-44 max-w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar contratos…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {meta && (
            <span className="text-xs text-muted-foreground">
              {meta.total} contrato{meta.total !== 1 ? 's' : ''}
            </span>
          )}
          <Button
            size="sm"
            onClick={() => {
              setCreatingContrato(true);
              setEditItem(null);
              setEditForm({
                nro_contrato: '',
                proveedor_id: '',
                tipo: 'Mantenimiento HW',
                descripcion: '',
                fecha_inicio: '',
                fecha_venc: '',
                estado: 'Vigente',
                monto: '',
                moneda: 'ARS',
                observaciones: '',
              });
            }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Contrato
          </Button>
        </div>
      </motion.div>

      <DataTable data={filtered} columns={columnsWithEdit} meta={meta} isLoading={loading} emptyMessage="No se encontraron contratos" />

      <Dialog
        open={!!editItem || creatingContrato}
        onOpenChange={(open) => {
          if (!open) {
            setEditItem(null);
            setCreatingContrato(false);
          }
        }}
      >
        <DialogContent className="max-w-lg p-0">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">{creatingContrato ? 'Nuevo contrato' : 'Editar contrato'}</h3>
          </div>
          {(editItem || creatingContrato) && (
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nro. contrato <span className="text-destructive">*</span>
                </label>
                <Input
                  value={editForm.nro_contrato}
                  onChange={(e) => setEditForm((f) => ({ ...f, nro_contrato: e.target.value }))}
                  className="h-9 text-sm"
                  placeholder="Ej. CONT-2025-001"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Proveedor <span className="text-destructive">*</span>
                </label>
                {creatingContrato ? (
                  <Select value={editForm.proveedor_id} onValueChange={(v) => setEditForm((f) => ({ ...f, proveedor_id: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={editItem?.proveedor?.nombre ?? '—'} className="h-9 text-sm bg-muted" readOnly disabled />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Tipo <span className="text-destructive">*</span>
                </label>
                <Select value={editForm.tipo || TIPOS_CONTRATO[0]} onValueChange={(v) => setEditForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONTRATO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Descripción</label>
                <Input
                  value={editForm.descripcion}
                  onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
                  className="h-9 text-sm"
                  placeholder="Texto"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Fecha inicio <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={editForm.fecha_inicio}
                    onChange={(e) => setEditForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Fecha venc. <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={editForm.fecha_venc}
                    onChange={(e) => setEditForm((f) => ({ ...f, fecha_venc: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Estado</label>
                <Select value={editForm.estado} onValueChange={(v) => setEditForm((f) => ({ ...f, estado: v }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Estado del contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_CONTRATO.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Monto</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.monto}
                    onChange={(e) => setEditForm((f) => ({ ...f, monto: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Ej. 150000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Moneda</label>
                  <Select value={editForm.moneda} onValueChange={(v) => setEditForm((f) => ({ ...f, moneda: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONEDAS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Observaciones</label>
                <Input
                  value={editForm.observaciones}
                  onChange={(e) => setEditForm((f) => ({ ...f, observaciones: e.target.value }))}
                  className="h-9 text-sm"
                  placeholder="Opcional"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <DialogClose asChild>
                  <Button variant="outline" size="sm">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button size="sm" loading={saving} onClick={handleSaveContrato}>
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

const MOCK_CONTRATOS: Contrato[] = [
  {
    id: 1,
    nro_contrato: 'CT-2024-001',
    tipo: 'Soporte SW',
    descripcion: 'Soporte del Sistema de Gestión Judicial',
    fecha_inicio: '2024-01-01',
    fecha_venc: '2024-12-31',
    monto: 1200000,
    moneda: 'ARS',
    estado: 'Por Vencer',
    activo: true,
    proveedor: { id: 1, nombre: 'InfoJudicial S.A.' },
  },
  {
    id: 2,
    nro_contrato: 'CT-2024-002',
    tipo: 'Conectividad',
    fecha_inicio: '2024-03-01',
    fecha_venc: '2025-03-01',
    monto: 850000,
    moneda: 'ARS',
    estado: 'Vigente',
    activo: true,
    proveedor: { id: 2, nombre: 'Telecom Argentina' },
  },
  {
    id: 3,
    nro_contrato: 'CT-2023-005',
    tipo: 'Mantenimiento HW',
    fecha_inicio: '2023-06-01',
    fecha_venc: '2025-06-01',
    monto: 450000,
    moneda: 'ARS',
    estado: 'Vigente',
    activo: true,
    proveedor: { id: 3, nombre: 'TechCorp SRL' },
  },
  {
    id: 4,
    nro_contrato: 'CT-2023-003',
    tipo: 'Seguridad IT',
    fecha_inicio: '2023-01-01',
    fecha_venc: '2024-01-01',
    monto: 300000,
    moneda: 'ARS',
    estado: 'Vencido',
    activo: true,
    proveedor: { id: 4, nombre: 'SecureIT' },
  },
];

