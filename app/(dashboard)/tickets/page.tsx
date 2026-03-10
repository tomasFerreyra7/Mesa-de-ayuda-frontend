'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, RefreshCw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { ticketsApi } from '@/lib/api';
import type { Ticket, TicketFilters, PaginationMeta } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { EstadoBadge, PrioridadBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRelative, getSLAStatus } from '@/lib/utils';
import { NewTicketDialog } from '@/components/tickets/new-ticket-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/auth.store';

// Técnicos solo ven sus tickets asignados y no pueden crear tickets.
const ROLES_TECNICOS = ['tecnico_interno', 'tecnico_proveedor'];
const ROLES_CAN_CREATE_TICKET = ['admin', 'operario'];

const ALL_FILTER = '__all__'; // Radix Select no permite value=""
const ESTADOS = [ALL_FILTER, 'Abierto', 'En Progreso', 'Resuelto', 'Cerrado'];
const PRIORIDADES = [ALL_FILTER, 'Critica', 'Alta', 'Media', 'Baja'];
const TIPOS = [ALL_FILTER, 'Hardware', 'Software', 'Red', 'Otro'];

const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: 'nroTicket',
    header: '#',
    size: 80,
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.nroTicket}</span>,
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    size: 90,
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.tipo}</span>,
  },
  {
    accessorKey: 'asunto',
    header: 'Asunto',
    cell: ({ row }) => {
      const sla = getSLAStatus(row.original.slaVenceEn ?? null, row.original.estado);
      return (
        <div className="max-w-[320px]">
          <p className="text-sm font-medium text-foreground truncate">{row.original.asunto}</p>
          <p className="text-xs text-muted-foreground truncate">{row.original.juzgado?.nombre ?? '—'}</p>
          {sla === 'overdue' && <span className="text-[10px] font-semibold text-danger">⚠ SLA vencido</span>}
          {sla === 'warning' && <span className="text-[10px] font-semibold text-warning">⚡ SLA por vencer</span>}
        </div>
      );
    },
  },
  {
    accessorKey: 'prioridad',
    header: 'Prioridad',
    size: 110,
    cell: ({ row }) => <PrioridadBadge prioridad={row.original.prioridad as never} />,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    size: 130,
    cell: ({ row }) => <EstadoBadge estado={row.original.estado as never} />,
  },
  {
    accessorKey: 'asignadoA',
    header: 'Asignado a',
    size: 140,
    cell: ({ row }) => {
      const u = row.original.asignadoA;
      if (!u) return <span className="text-xs text-muted-foreground">Sin asignar</span>;
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
            style={{ backgroundColor: u.avatarColor ?? '#2563EB' }}
          >
            {u.iniciales ?? u.nombre[0]}
          </div>
          <span className="text-sm truncate">{u.nombre}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'fechaCreacion',
    header: 'Creado',
    size: 100,
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.fechaCreacion)}</span>,
  },
];

export default function TicketsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>();
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [filters, setFilters] = useState<TicketFilters>({ page: 1, per_page: 20 });
  const [search, setSearch] = useState('');

  const isTecnico = user?.rol && ROLES_TECNICOS.includes(user.rol);
  const canCreateTicket = user?.rol && ROLES_CAN_CREATE_TICKET.includes(user.rol);

  const load = useCallback(
    async (f: TicketFilters) => {
      setLoading(true);
      const params: TicketFilters = { ...f };
      if (isTecnico && user?.id) params.asignado_a_id = user.id;
      try {
        const res = await ticketsApi.list(params);
        const data = res.data.data ?? [];
        setTickets(data);
        setMeta(res.data.meta);
      } catch {
        setTickets(MOCK_TICKETS);
        setMeta({ total: MOCK_TICKETS.length, page: 1, per_page: 20, pages: 1 });
      } finally {
        setLoading(false);
      }
    },
    [isTecnico, user?.id],
  );

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  const handleSearch = (q: string) => {
    setSearch(q);
    setFilters((prev) => ({ ...prev, q: q || undefined, page: 1 }));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-44 max-w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar tickets…" value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>

        <Select value={filters.estado ?? ALL_FILTER} onValueChange={(v) => setFilters((p) => ({ ...p, estado: v === ALL_FILTER ? undefined : v, page: 1 }))}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>
                {e === ALL_FILTER ? 'Todos los estados' : e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.prioridad ?? ALL_FILTER}
          onValueChange={(v) => setFilters((p) => ({ ...p, prioridad: v === ALL_FILTER ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            {PRIORIDADES.map((p) => (
              <SelectItem key={p} value={p}>
                {p === ALL_FILTER ? 'Todas las prioridades' : p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.tipo ?? ALL_FILTER} onValueChange={(v) => setFilters((p) => ({ ...p, tipo: v === ALL_FILTER ? undefined : v, page: 1 }))}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {t === ALL_FILTER ? 'Todos los tipos' : t}
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
              {meta.total} ticket{meta.total !== 1 ? 's' : ''}
            </span>
          )}
          {canCreateTicket && (
            <Button size="sm" onClick={() => setShowNewDialog(true)}>
              <Plus className="w-4 h-4" />
              Nuevo Ticket
            </Button>
          )}
        </div>
      </motion.div>

      {/* Table */}
      <DataTable
        data={tickets}
        columns={columns}
        meta={meta}
        isLoading={loading}
        onPageChange={(page) => setFilters((p) => ({ ...p, page }))}
        onRowClick={(ticket) => router.push(`/tickets/${ticket.id}`)}
        emptyMessage="No hay tickets para los filtros seleccionados"
      />

      {/* New Ticket Dialog */}
      {canCreateTicket && <NewTicketDialog open={showNewDialog} onClose={() => setShowNewDialog(false)} onSuccess={() => load(filters)} />}
    </div>
  );
}

// Mock data
const MOCK_TICKETS: Ticket[] = [
  {
    id: 1,
    nroTicket: '#1041',
    tipo: 'Hardware',
    asunto: 'PC no enciende en Juzgado Civil 3',
    estado: 'Abierto',
    prioridad: 'Alta',
    creadoPorId: 1,
    juzgadoId: 1,
    fechaCreacion: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    juzgado: { id: 1, nombre: 'Juzgado Civil 3' },
  },
  {
    id: 2,
    nroTicket: '#1040',
    tipo: 'Software',
    asunto: 'Error en Sistema de Gestión al guardar expediente',
    estado: 'En Progreso',
    prioridad: 'Critica',
    creadoPorId: 2,
    juzgadoId: 2,
    fechaCreacion: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
    juzgado: { id: 2, nombre: 'Cámara Penal' },
    asignadoA: {
      id: 3,
      nombre: 'Lucas Fernández',
      email: 'l.fernandez@pj.gob.ar',
      rol: 'tecnico_interno',
      activo: true,
      iniciales: 'LF',
      avatarColor: '#7C3AED',
    },
  },
  {
    id: 3,
    nroTicket: '#1039',
    tipo: 'Red',
    asunto: 'Sin conexión a internet en Civil 2, Puesto 3',
    estado: 'Resuelto',
    prioridad: 'Media',
    creadoPorId: 1,
    juzgadoId: 3,
    fechaCreacion: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    juzgado: { id: 3, nombre: 'Juzgado Civil 2' },
  },
  {
    id: 4,
    nroTicket: '#1038',
    tipo: 'Hardware',
    asunto: 'Impresora HP offline Secretaría 1',
    estado: 'Abierto',
    prioridad: 'Baja',
    creadoPorId: 1,
    juzgadoId: 4,
    fechaCreacion: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date().toISOString(),
    juzgado: { id: 4, nombre: 'Secretaría 1' },
  },
  {
    id: 5,
    nroTicket: '#1037',
    tipo: 'Software',
    asunto: 'Licencia de Office vencida en sala de audiencias',
    estado: 'Cerrado',
    prioridad: 'Alta',
    creadoPorId: 2,
    juzgadoId: 5,
    fechaCreacion: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date().toISOString(),
    juzgado: { id: 5, nombre: 'Tribunal Oral' },
  },
];

