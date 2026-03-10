'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, RefreshCw, Pencil } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { contratosApi } from '@/lib/api';
import type { Contrato, PaginationMeta } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { formatDate, formatMoney, cn } from '@/lib/utils';
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

const columns: ColumnDef<Contrato>[] = [
  {
    accessorKey: 'nro_contrato',
    header: 'Nro. Contrato',
    size: 130,
    cell: ({ row }) => <span className="font-mono text-xs font-medium text-foreground">{row.original.nro_contrato}</span>,
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
      const days = differenceInDays(parseISO(row.original.fecha_venc), new Date());
      return (
        <div>
          <p className={cn('text-sm font-medium', days < 0 ? 'text-danger' : days <= 30 ? 'text-warning' : 'text-foreground')}>
            {formatDate(row.original.fecha_venc)}
          </p>
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
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ nro_contrato: '', tipo: '', descripcion: '', fecha_inicio: '', fecha_venc: '', monto: '', moneda: 'ARS' });

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

  const filtered = search
    ? contratos.filter(
        (c) =>
          c.nro_contrato.toLowerCase().includes(search.toLowerCase()) ||
          c.proveedor?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
          c.tipo.toLowerCase().includes(search.toLowerCase()),
      )
    : contratos;

  const openEdit = (c: Contrato) => {
    setEditItem(c);
    setEditForm({
      nro_contrato: c.nro_contrato,
      tipo: c.tipo,
      descripcion: c.descripcion ?? '',
      fecha_inicio: c.fecha_inicio ?? '',
      fecha_venc: c.fecha_venc ?? '',
      monto: c.monto != null ? String(c.monto) : '',
      moneda: c.moneda ?? 'ARS',
    });
  };

  const handleSaveContrato = async () => {
    if (!editItem?.proveedor?.id) return;
    setSaving(true);
    try {
      await contratosApi.update(editItem.id, {
        nro_contrato: editForm.nro_contrato,
        proveedor_id: editItem.proveedor.id,
        tipo: editForm.tipo,
        descripcion: editForm.descripcion || undefined,
        fecha_inicio: editForm.fecha_inicio,
        fecha_venc: editForm.fecha_venc,
        monto: editForm.monto ? Number(editForm.monto) : undefined,
        moneda: editForm.moneda,
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

  const columnsWithEdit: ColumnDef<Contrato>[] = [
    ...columns,
    ...(canEdit
      ? [
          {
            id: 'acciones',
            header: '',
            size: 60,
            cell: ({ row }: { row: { original: Contrato } }) => (
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
          } as ColumnDef<Contrato>,
        ]
      : []),
  ];

  if (isTecnico) return null;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3">
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
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Nuevo Contrato
          </Button>
        </div>
      </motion.div>

      <DataTable data={filtered} columns={columnsWithEdit} meta={meta} isLoading={loading} emptyMessage="No se encontraron contratos" />

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="max-w-lg p-0">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">Editar contrato</h3>
          </div>
          {editItem && (
            <div className="px-6 py-5 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nro. contrato</label>
                <Input value={editForm.nro_contrato} onChange={(e) => setEditForm((f) => ({ ...f, nro_contrato: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tipo</label>
                <Input value={editForm.tipo} onChange={(e) => setEditForm((f) => ({ ...f, tipo: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Descripción</label>
                <Input value={editForm.descripcion} onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Fecha inicio</label>
                  <Input
                    type="date"
                    value={editForm.fecha_inicio}
                    onChange={(e) => setEditForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Fecha venc.</label>
                  <Input
                    type="date"
                    value={editForm.fecha_venc}
                    onChange={(e) => setEditForm((f) => ({ ...f, fecha_venc: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Monto</label>
                  <Input type="number" value={editForm.monto} onChange={(e) => setEditForm((f) => ({ ...f, monto: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Moneda</label>
                  <Input value={editForm.moneda} onChange={(e) => setEditForm((f) => ({ ...f, moneda: e.target.value }))} className="h-9 text-sm" />
                </div>
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

