'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, User, Wrench, Send, Lock, AlertTriangle, Pencil, X } from 'lucide-react';
import { ticketsApi, usuariosApi } from '@/lib/api';
import type { Ticket, Comentario, User as ApiUser } from '@/lib/api';

// Normaliza comentarios del backend (entidad TicketComentario: id, ticket_id, usuario_id, texto, interno, created_at, usuario)
function normalizeComentarios(res: unknown): Comentario[] {
  const raw = res as Record<string, unknown> | undefined;
  const data = raw?.data as Record<string, unknown> | unknown[] | undefined;
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).data))
    list = (data as Record<string, unknown>).data as unknown[];
  else if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).comentarios))
    list = (data as Record<string, unknown>).comentarios as unknown[];
  if (!list.length) return [];
  return list.map((c) => {
    const x = (c as Record<string, unknown>) ?? {};
    // Backend: created_at / createdAt (TypeORM CreateDateColumn); puede venir como string ISO, Date o número (segundos/ms)
    const rawFecha = x.created_at ?? x.createdAt ?? x.fechaCreacion ?? x.fecha_creacion;
    const fechaCreacion = toIsoDateString(rawFecha);
    // Backend: relación usuario (ManyToOne Usuario)
    const autorRaw = (x.usuario ?? x.autor ?? x.user) as Record<string, unknown> | undefined;
    const autor: ApiUser | undefined = autorRaw
      ? {
          id: Number(autorRaw.id),
          nombre: String(autorRaw.nombre ?? autorRaw.name ?? '—'),
          email: String(autorRaw.email ?? ''),
          rol: String(autorRaw.rol ?? autorRaw.role ?? 'operario') as ApiUser['rol'],
          activo: autorRaw.activo !== undefined ? Boolean(autorRaw.activo) : true,
          ...(autorRaw.iniciales != null && { iniciales: String(autorRaw.iniciales) }),
          ...((autorRaw.avatarColor ?? autorRaw.avatar_color) != null && {
            avatarColor: String(autorRaw.avatarColor ?? autorRaw.avatar_color),
          }),
        }
      : undefined;
    return {
      id: Number(x.id),
      texto: String(x.texto ?? ''),
      interno: Boolean(x.interno),
      fechaCreacion: fechaCreacion ?? '',
      autor,
    } as Comentario;
  });
}

/** Convierte created_at del backend a string ISO para mostrar bien la fecha (evita "ahora mismo" erróneo). */
function toIsoDateString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === 'number') {
    // Backend puede enviar segundos (TypeORM) o milisegundos
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === 'object' && 'toISOString' in (value as Date)) return (value as Date).toISOString();
  return null;
}
import { EstadoBadge, PrioridadBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatRelative, getSLAStatus, getSLAPriority, getInitials, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';

const ESTADOS_TRANSICION = ['Abierto', 'En Progreso', 'Resuelto', 'Cerrado'] as const;
const PRIORIDADES = ['Critica', 'Alta', 'Media', 'Baja'] as const;

// Quien puede editar asunto, descripción, prioridad, asignar (cualquier ticket)
const ROLES_CAN_EDIT_TICKET = ['admin', 'operario'];
// Técnicos solo ven tickets asignados a ellos y pueden cambiar solo el estado.
const ROLES_TECNICOS = ['tecnico_interno', 'tecnico_proveedor'];
const ROLES_CAN_CHANGE_ESTADO = ['admin', 'operario', 'tecnico_interno', 'tecnico_proveedor'];

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [interno, setInterno] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editAsunto, setEditAsunto] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editPrioridad, setEditPrioridad] = useState<string>('');
  const [editAsignadoId, setEditAsignadoId] = useState<string>('');
  const [tecnicos, setTecnicos] = useState<ApiUser[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const canEdit = user?.rol && ROLES_CAN_EDIT_TICKET.includes(user.rol);
  const canChangeEstado = user?.rol && ROLES_CAN_CHANGE_ESTADO.includes(user.rol);
  const isTecnico = user?.rol && ROLES_TECNICOS.includes(user.rol);
  // Backend puede devolver asignadoAId y/o asignadoA.id
  const isAsignadoAMi = ticket && user?.id && (ticket.asignadoAId === user.id || ticket.asignadoA?.id === user.id);
  const tecnicoNoAutorizado = isTecnico && ticket && !isAsignadoAMi;

  const load = async () => {
    try {
      const [tRes, cRes] = await Promise.all([ticketsApi.get(Number(id)), ticketsApi.comentarios(Number(id))]);
      setTicket(tRes.data.data);
      setComentarios(normalizeComentarios(cRes.data));
    } catch {
      // Use mock
      setTicket(MOCK_TICKET);
      setComentarios(MOCK_COMENTARIOS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (ticket?.juzgadoId && canEdit) {
      usuariosApi
        .tecnicosDisponibles(ticket.juzgadoId)
        .then((r) => {
          const list = Array.isArray(r.data) ? r.data : ((r.data as { data?: ApiUser[] })?.data ?? []);
          setTecnicos(list);
        })
        .catch(() => setTecnicos([]));
    }
  }, [ticket?.juzgadoId, canEdit]);

  useEffect(() => {
    if (ticket) {
      setEditAsunto(ticket.asunto);
      setEditDescripcion(ticket.descripcion ?? '');
      setEditPrioridad(ticket.prioridad);
      setEditAsignadoId(ticket.asignadoAId ? String(ticket.asignadoAId) : '');
    }
  }, [ticket]);

  const handleChangeEstado = async (estado: string) => {
    if (!ticket) return;
    try {
      await ticketsApi.changeEstado(ticket.id, estado);
      setTicket((prev) => (prev ? { ...prev, estado: estado as Ticket['estado'] } : null));
      toast.success(`Estado actualizado a "${estado}"`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Error al cambiar el estado');
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !ticket) return;
    setSubmitting(true);
    try {
      await ticketsApi.addComentario(ticket.id, newComment, interno);
      toast.success('Comentario agregado');
      setNewComment('');
      load();
    } catch {
      toast.error('Error al agregar comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!ticket) return;
    setSavingEdit(true);
    try {
      await ticketsApi.update(ticket.id, {
        asunto: editAsunto,
        descripcion: editDescripcion || undefined,
        prioridad: editPrioridad,
      });
      const prevAsignado = String(ticket.asignadoAId ?? '');
      if (editAsignadoId !== prevAsignado) {
        if (editAsignadoId) {
          await ticketsApi.asignar(ticket.id, Number(editAsignadoId));
        }
      }
      toast.success('Ticket actualizado');
      setEditing(false);
      load();
    } catch {
      toast.error('Error al guardar cambios');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6">
            <div className="space-y-3">
              <div className="h-5 bg-secondary rounded animate-pulse w-1/2" />
              <div className="h-3 bg-secondary rounded animate-pulse w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!ticket) return <p className="text-muted-foreground">Ticket no encontrado</p>;

  // Técnicos solo pueden ver tickets asignados a ellos.
  if (tecnicoNoAutorizado) {
    return (
      <div className="max-w-4xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/tickets')} className="gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a tickets
        </Button>
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-5 text-warning">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">No tenés permiso para ver este ticket</p>
            <p className="text-sm opacity-90">Solo podés ver y cambiar el estado de los tickets asignados a vos.</p>
          </div>
        </div>
      </div>
    );
  }

  const slaStatus = getSLAStatus(ticket.slaVenceEn ?? null, ticket.estado);

  return (
    <div className="max-w-4xl space-y-4">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5">
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver
      </Button>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs text-muted-foreground">{ticket.nroTicket}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{ticket.tipo}</span>
            </div>
            <h1 className="text-lg font-semibold text-foreground">{ticket.asunto}</h1>
            {ticket.descripcion && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{ticket.descripcion}</p>}
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {!editing && <PrioridadBadge prioridad={ticket.prioridad as never} />}
            {/* Estado: admin/operario siempre; técnicos solo en tickets asignados a ellos */}
            {canChangeEstado || (isTecnico && isAsignadoAMi) ? (
              <Select value={ticket.estado} onValueChange={handleChangeEstado}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_TRANSICION.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <EstadoBadge estado={ticket.estado as never} />
            )}
          </div>
        </div>

        {/* Editar asunto, descripción, prioridad, asignar (solo admin/operario); estado no se edita aquí */}
        {canEdit && (
          <div className="mt-5 pt-5 border-t border-border">
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                Editar ticket
              </Button>
            ) : (
              <div className="space-y-5 p-5 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-foreground">Editar datos del ticket</span>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="gap-1">
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Asunto <span className="text-destructive">*</span>
                    </label>
                    <Input value={editAsunto} onChange={(e) => setEditAsunto(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-foreground">Descripción</label>
                    <Textarea value={editDescripcion} onChange={(e) => setEditDescripcion(e.target.value)} rows={4} className="text-sm min-h-[100px]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Prioridad <span className="text-destructive">*</span>
                    </label>
                    <Select value={editPrioridad} onValueChange={setEditPrioridad}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORIDADES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Asignado a</label>
                    <Select value={editAsignadoId || '__none__'} onValueChange={(v) => setEditAsignadoId(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin asignar</SelectItem>
                        {tecnicos.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button size="sm" loading={savingEdit} onClick={handleSaveEdit}>
                  Guardar cambios
                </Button>
              </div>
            )}
          </div>
        )}

        {/* SLA alert */}
        {slaStatus === 'overdue' && (
          <div className="mt-4 flex items-center gap-2 bg-danger-light border border-danger/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
            <p className="text-sm font-medium text-danger">SLA vencido</p>
          </div>
        )}
        {slaStatus === 'warning' && (
          <div className="mt-4 flex items-center gap-2 bg-warning-light border border-warning/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
            <p className="text-sm font-medium text-warning">SLA por vencer</p>
          </div>
        )}

        {/* Meta grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
          <MetaItem icon={User} label="Creado por" value={ticket.creadoPor?.nombre ?? '—'} />
          <MetaItem icon={Wrench} label="Asignado a" value={ticket.asignadoA?.nombre ?? 'Sin asignar'} />
          <MetaItem icon={Clock} label="Creado" value={formatDate(ticket.fechaCreacion, 'dd/MM/yyyy HH:mm')} />
          <MetaItem
            icon={Clock}
            label={`SLA (${getSLAPriority(ticket.prioridad)})`}
            value={ticket.slaVenceEn ? formatDate(ticket.slaVenceEn, 'dd/MM HH:mm') : '—'}
            className={cn(slaStatus === 'overdue' && 'text-danger', slaStatus === 'warning' && 'text-warning')}
          />
        </div>
      </motion.div>

      {/* Comentarios */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Comentarios ({comentarios.length})</h2>
        </div>

        <div className="divide-y divide-border/50">
          {comentarios.map((c) => (
            <div key={c.id} className={cn('px-6 py-4', c.interno && 'bg-warning-light/30')}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                  style={{ backgroundColor: c.autor?.avatarColor ?? '#2563EB' }}
                >
                  {c.autor?.iniciales ?? getInitials(c.autor?.nombre ?? '?')}
                </div>
                <span className="text-sm font-medium text-foreground">{c.autor?.nombre ?? '—'}</span>
                {c.interno && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-warning bg-warning-light px-1.5 py-0.5 rounded">
                    <Lock className="w-2.5 h-2.5" /> Nota interna
                  </span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">{formatRelative(c.fechaCreacion)}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{c.texto}</p>
            </div>
          ))}

          {comentarios.length === 0 && <div className="px-6 py-8 text-center text-sm text-muted-foreground">Sin comentarios todavía</div>}
        </div>

        {/* Add comment */}
        <div className="px-6 py-4 border-t border-border space-y-3">
          <Textarea placeholder="Escribí un comentario…" value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={3} />
          <div className="flex items-center justify-between">
            {user?.rol !== 'tecnico_proveedor' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={interno} onChange={(e) => setInterno(e.target.checked)} className="rounded" />
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Nota interna
                </span>
              </label>
            )}
            <Button size="sm" className="ml-auto" loading={submitting} onClick={handleComment} disabled={!newComment.trim()}>
              <Send className="w-3.5 h-3.5" />
              Enviar
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function MetaItem({ icon: Icon, label, value, className }: { icon: React.ElementType; label: string; value: string; className?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className={cn('text-sm font-medium text-foreground', className)}>{value}</p>
    </div>
  );
}

// Mock data
const MOCK_TICKET: Ticket = {
  id: 1,
  nroTicket: '#1041',
  tipo: 'Hardware',
  asunto: 'PC no enciende en Juzgado Civil 3',
  descripcion:
    'La PC del puesto 3 no enciende desde esta mañana. Se intentó reiniciar desde el botón de encendido varias veces sin éxito. No hay señal en el monitor.',
  estado: 'En Progreso',
  prioridad: 'Alta',
  creadoPorId: 1,
  juzgadoId: 1,
  fechaCreacion: new Date(Date.now() - 3600000).toISOString(),
  updatedAt: new Date().toISOString(),
  slaVenceEn: new Date(Date.now() + 14400000).toISOString(),
  slaCumplido: false,
  juzgado: { id: 1, nombre: 'Juzgado Civil 3' },
  creadoPor: { id: 1, nombre: 'María García', email: 'm.garcia@pj.gob.ar', rol: 'operario', activo: true, iniciales: 'MG', avatarColor: '#059669' },
  asignadoA: {
    id: 3,
    nombre: 'Lucas Fernández',
    email: 'l.fernandez@pj.gob.ar',
    rol: 'tecnico_interno',
    activo: true,
    iniciales: 'LF',
    avatarColor: '#7C3AED',
  },
};

const MOCK_COMENTARIOS: Comentario[] = [
  {
    id: 1,
    texto: 'Pasé a verificar el equipo. El problema parece ser la fuente de alimentación. Voy a traer una de repuesto.',
    interno: false,
    fechaCreacion: new Date(Date.now() - 1800000).toISOString(),
    autor: { id: 3, nombre: 'Lucas Fernández', email: 'l.fernandez@pj.gob.ar', rol: 'tecnico_interno', activo: true, iniciales: 'LF', avatarColor: '#7C3AED' },
  },
  {
    id: 2,
    texto: 'Confirmar con bodega si hay fuente de 500W disponible antes de ir.',
    interno: true,
    fechaCreacion: new Date(Date.now() - 900000).toISOString(),
    autor: { id: 2, nombre: 'Admin Sistema', email: 'admin@pj.gob.ar', rol: 'admin', activo: true, iniciales: 'AS', avatarColor: '#DC2626' },
  },
];

