'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ticketsApi, ubicacionesApi, usuariosApi, equiposApi, softwareApi } from '@/lib/api';
import type { User, Equipo, Software } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { getOperarioJuzgadoId } from '@/lib/utils';

/** Soporta { data: Software[] }, { data: { data: [] } }, array plano, items, software. */
function parseSoftwareListFromResponse(body: unknown): Software[] {
  if (Array.isArray(body)) return body as Software[];
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    const d = o.data;
    if (Array.isArray(d)) return d as Software[];
    if (d && typeof d === 'object') {
      const inner = d as Record<string, unknown>;
      if (Array.isArray(inner.data)) return inner.data as Software[];
      if (Array.isArray(inner.items)) return inner.items as Software[];
    }
    for (const key of ['items', 'software', 'results'] as const) {
      const val = o[key];
      if (Array.isArray(val)) return val as Software[];
    }
  }
  return [];
}

function parseTecnicosFromResponse(body: unknown): User[] {
  if (Array.isArray(body)) return body as User[];
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    for (const key of ['data', 'usuarios', 'tecnicos', 'items', 'users']) {
      const val = o[key];
      if (Array.isArray(val)) return val as User[];
      if (val && typeof val === 'object' && Array.isArray((val as Record<string, unknown>).data)) {
        return (val as { data: User[] }).data;
      }
    }
    if (o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
      const inner = (o.data as Record<string, unknown>).data ?? (o.data as Record<string, unknown>).usuarios ?? (o.data as Record<string, unknown>).tecnicos;
      if (Array.isArray(inner)) return inner as User[];
    }
  }
  return [];
}

const schema = z
  .object({
    tipo: z.enum(['Hardware', 'Software', 'Red', 'Otro']),
    asunto: z.string().min(5, 'Mínimo 5 caracteres').max(255),
    descripcion: z.string().optional(),
    prioridad: z.enum(['Critica', 'Alta', 'Media', 'Baja']),
    juzgado_id: z.string().min(1, 'Seleccioná un juzgado'),
    equipo_id: z.string().refine((v) => v && v !== '__none__' && !Number.isNaN(parseInt(v, 10)), 'Seleccioná un equipo'),
    software_id: z.string().optional(),
    asignado_a_id: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === 'Software' && (!data.software_id || data.software_id === '__none__')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Seleccioná un software', path: ['software_id'] });
    }
  });

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewTicketDialog({ open, onClose, onSuccess }: Props) {
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.rol === 'admin';
  const operarioJuzgadoId = useMemo(() => getOperarioJuzgadoId(authUser), [authUser]);

  const [juzgados, setJuzgados] = useState<{ id: number; nombre: string }[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [loadingSoftware, setLoadingSoftware] = useState(false);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [tecnicos, setTecnicos] = useState<User[]>([]);
  const [tecnicosLoading, setTecnicosLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'Hardware', prioridad: 'Media', equipo_id: '__none__', software_id: '__none__', juzgado_id: '' },
  });

  const tipo = watch('tipo');
  const juzgadoId = watch('juzgado_id');

  // Lista de juzgados solo para admin
  useEffect(() => {
    if (!open || !isAdmin) return;
    ubicacionesApi
      .juzgados()
      .then((res) => {
        setJuzgados(res.data.data ?? []);
      })
      .catch(() => setJuzgados([]));
  }, [open, isAdmin]);

  // Al abrir: resetear formulario; operario: juzgado fijo
  useEffect(() => {
    if (!open) return;
    reset({
      tipo: 'Hardware',
      prioridad: 'Media',
      equipo_id: '__none__',
      software_id: '__none__',
      asunto: '',
      descripcion: '',
      asignado_a_id: undefined,
      juzgado_id: isAdmin ? '' : operarioJuzgadoId != null ? String(operarioJuzgadoId) : '',
    });
  }, [open, isAdmin, operarioJuzgadoId, reset]);

  // Catálogo de software al abrir el modal (listo cuando el usuario elige tipo Software)
  useEffect(() => {
    if (!open) {
      setSoftwareList([]);
      return;
    }
    let cancelled = false;
    setLoadingSoftware(true);
    const loadPages = async () => {
      const perPage = 100;
      const merged: Software[] = [];
      try {
        let page = 1;
        let totalPages = 1;
        do {
          const res = await softwareApi.list({ page, per_page: perPage });
          if (cancelled) return;
          const chunk = parseSoftwareListFromResponse(res.data);
          merged.push(...chunk);
          const meta = (res.data as { meta?: { pages?: number } })?.meta;
          totalPages = meta?.pages ?? 1;
          if (chunk.length === 0) break;
          page += 1;
        } while (page <= totalPages && page <= 50);
        if (!cancelled) setSoftwareList(merged);
      } catch {
        if (!cancelled) setSoftwareList([]);
      } finally {
        if (!cancelled) setLoadingSoftware(false);
      }
    };
    void loadPages();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Equipos filtrados por juzgado seleccionado (admin) o del operario
  useEffect(() => {
    if (!open) return;
    let jid: number | undefined;
    if (isAdmin) {
      const v = juzgadoId;
      jid = v ? parseInt(v, 10) : undefined;
    } else {
      jid = operarioJuzgadoId;
    }
    if (jid == null || Number.isNaN(jid)) {
      setEquipos([]);
      setValue('equipo_id', '__none__');
      return;
    }
    setLoadingEquipos(true);
    equiposApi
      .list({ juzgado_id: jid, per_page: 100, page: 1 })
      .then((res) => {
        setEquipos(res.data.data ?? []);
        setValue('equipo_id', '__none__');
      })
      .catch(() => {
        setEquipos([]);
        setValue('equipo_id', '__none__');
      })
      .finally(() => setLoadingEquipos(false));
  }, [open, isAdmin, juzgadoId, operarioJuzgadoId, setValue]);

  useEffect(() => {
    if (tipo !== 'Software') setValue('software_id', '__none__');
  }, [tipo, setValue]);

  useEffect(() => {
    if (!open) {
      setTecnicos([]);
      setTecnicosLoading(false);
      return;
    }
    let cancelled = false;
    setTecnicosLoading(true);
    const setList = (list: User[]) => {
      if (!cancelled) {
        setTecnicos(list);
        setTecnicosLoading(false);
      }
    };
    const fetchTecnicos = async () => {
      try {
        const id = juzgadoId ? parseInt(juzgadoId, 10) : undefined;
        const r = await usuariosApi.tecnicosDisponibles(Number.isNaN(id as number) ? undefined : id);
        const list = parseTecnicosFromResponse(r.data as unknown);
        if (list.length > 0) {
          setList(list);
          return;
        }
        if (id != null && !Number.isNaN(id)) {
          const r2 = await usuariosApi.tecnicosDisponibles();
          setList(parseTecnicosFromResponse(r2.data as unknown));
        } else {
          setList([]);
        }
      } catch {
        if (!cancelled) setTecnicosLoading(false);
        setList([]);
      }
    };
    fetchTecnicos();
    return () => {
      cancelled = true;
    };
  }, [open, juzgadoId]);

  const onSubmit = async (data: FormData) => {
    const juzgadoIdNum = parseInt(data.juzgado_id, 10);
    if (Number.isNaN(juzgadoIdNum)) {
      toast.error('Seleccioná un juzgado');
      return;
    }
    const equipoIdNum = data.equipo_id && data.equipo_id !== '__none__' ? parseInt(data.equipo_id, 10) : NaN;
    if (Number.isNaN(equipoIdNum)) {
      toast.error('Seleccioná un equipo');
      return;
    }
    if (data.tipo === 'Software' && (!data.software_id || data.software_id === '__none__')) {
      toast.error('Seleccioná un software');
      return;
    }
    try {
      // Backend: juzgado_id debe ser el del modal (admin: select; operario: juzgado fijo), también para tickets tipo Software.
      const payload = {
        tipo: data.tipo,
        asunto: data.asunto.trim(),
        prioridad: data.prioridad,
        juzgado_id: juzgadoIdNum,
        equipo_id: equipoIdNum,
        ...(data.tipo === 'Software' && data.software_id && data.software_id !== '__none__' ? { software_id: parseInt(data.software_id, 10) } : {}),
        ...(data.descripcion?.trim() && { descripcion: data.descripcion.trim() }),
      };
      const res = await ticketsApi.create(payload);
      const createdId = (res.data as { data?: { id?: number } })?.data?.id;
      const tecnicoId = data.asignado_a_id && data.asignado_a_id !== '__none__' ? parseInt(data.asignado_a_id, 10) : null;
      if (createdId != null && tecnicoId != null && !Number.isNaN(tecnicoId)) {
        try {
          await ticketsApi.asignar(createdId, tecnicoId);
        } catch {
          toast.warning('Ticket creado pero no se pudo asignar al técnico');
        }
      }
      toast.success('Ticket creado correctamente');
      reset();
      onClose();
      onSuccess();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string };
      const dataMsg = ax.response?.data;
      const msg =
        typeof dataMsg?.message === 'string'
          ? dataMsg.message
          : Array.isArray(dataMsg?.message)
            ? dataMsg.message.join(', ')
            : (dataMsg?.message ?? dataMsg?.error ?? ax.message ?? 'Error al crear el ticket');
      toast.error(msg);
    }
  };

  const placeholdersByTipo: Record<string, { asunto: string; desc: string }> = {
    Hardware: { asunto: 'Ej: PC no enciende en Juzgado Civil 3', desc: 'Describir el fallo: síntomas, desde cuándo ocurre…' },
    Software: { asunto: 'Ej: Error al abrir el Sistema de Gestión Judicial', desc: 'Describir el error: mensaje que aparece, pasos para reproducirlo…' },
    Red: { asunto: 'Ej: Sin conexión a internet en Civil 2, Puesto 3', desc: 'Indicar si afecta a uno o varios equipos, desde cuándo…' },
    Otro: { asunto: 'Ej: Solicitud de acceso a carpeta compartida', desc: 'Describir la situación o solicitud con el mayor detalle…' },
  };

  const ph = placeholdersByTipo[tipo] ?? placeholdersByTipo.Hardware;

  const operarioSinJuzgado = !isAdmin && operarioJuzgadoId == null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Nuevo Ticket" description="Completá los datos del incidente o solicitud" size="md">
        {operarioSinJuzgado && (
          <div className="mx-6 mt-2 rounded-md border border-warning/40 bg-warning-light px-3 py-2 text-xs text-foreground">
            Tu usuario operario no tiene juzgado asignado. Pedile a un administrador que te asocie a un juzgado para poder crear tickets.
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Tipo <span className="text-destructive">*</span>
              </label>
              <Select value={tipo} onValueChange={(v) => setValue('tipo', v as FormData['tipo'])}>
                <SelectTrigger error={!!errors.tipo}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Hardware', 'Software', 'Red', 'Otro'].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Prioridad <span className="text-destructive">*</span>
              </label>
              <Select value={watch('prioridad')} onValueChange={(v) => setValue('prioridad', v as FormData['prioridad'])}>
                <SelectTrigger error={!!errors.prioridad}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: 'Critica', label: '🔴 Crítica (SLA 4h)' },
                    { value: 'Alta', label: '🟠 Alta (SLA 8h)' },
                    { value: 'Media', label: '🟡 Media (SLA 24h)' },
                    { value: 'Baja', label: '⚪ Baja (SLA 72h)' },
                  ].map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Asunto <span className="text-destructive">*</span>
            </label>
            <Input {...register('asunto')} placeholder={ph.asunto} error={!!errors.asunto} />
            {errors.asunto && <p className="text-xs text-danger">{errors.asunto.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Descripción</label>
            <Textarea {...register('descripcion')} placeholder={ph.desc} rows={3} />
          </div>

          {/* Juzgado: solo admin elige; operario usa el asignado */}
          {isAdmin ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Juzgado <span className="text-destructive">*</span>
              </label>
              <Select
                value={watch('juzgado_id') ?? ''}
                onValueChange={(v) => {
                  setValue('juzgado_id', v);
                  setValue('equipo_id', '__none__');
                }}
              >
                <SelectTrigger error={!!errors.juzgado_id}>
                  <SelectValue placeholder="Seleccioná el juzgado…" />
                </SelectTrigger>
                <SelectContent>
                  {juzgados.map((j) => (
                    <SelectItem key={j.id} value={String(j.id)}>
                      {j.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.juzgado_id && <p className="text-xs text-danger">{errors.juzgado_id.message}</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Juzgado</label>
              <Input
                readOnly
                disabled
                className="bg-muted cursor-not-allowed"
                value={authUser?.juzgado?.nombre ?? (operarioJuzgadoId != null ? `Juzgado #${operarioJuzgadoId}` : '—')}
              />
              <input type="hidden" {...register('juzgado_id')} />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Equipo <span className="text-destructive">*</span>
            </label>
            <Select
              value={watch('equipo_id') ?? '__none__'}
              onValueChange={(v) => setValue('equipo_id', v)}
              disabled={loadingEquipos || operarioSinJuzgado || (isAdmin && !juzgadoId)}
            >
              <SelectTrigger error={!!errors.equipo_id}>
                <SelectValue
                  placeholder={
                    loadingEquipos
                      ? 'Cargando equipos…'
                      : isAdmin && !juzgadoId
                        ? 'Primero elegí un juzgado'
                        : operarioSinJuzgado
                          ? 'Sin juzgado asignado'
                          : 'Seleccioná el equipo…'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Seleccioná el equipo…</SelectItem>
                {equipos.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.nro_inventario ?? e.nroInventario} — {e.clase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.equipo_id && <p className="text-xs text-danger">{errors.equipo_id.message}</p>}
          </div>

          {tipo === 'Software' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Software <span className="text-destructive">*</span>
              </label>
              <Select value={watch('software_id') ?? '__none__'} onValueChange={(v) => setValue('software_id', v)}>
                <SelectTrigger error={!!errors.software_id}>
                  <SelectValue
                    placeholder={
                      loadingSoftware ? 'Cargando software…' : softwareList.length === 0 ? 'No hay software en el catálogo' : 'Seleccioná el software…'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccioná el software…</SelectItem>
                  {softwareList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nombre}
                      {s.version ? ` (${s.version})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.software_id && <p className="text-xs text-danger">{errors.software_id.message}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Asignar a</label>
            <Select
              value={watch('asignado_a_id') ?? '__none__'}
              onValueChange={(v) => setValue('asignado_a_id', v === '__none__' ? undefined : v)}
              disabled={tecnicosLoading && tecnicos.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    tecnicosLoading ? 'Cargando técnicos…' : tecnicos.length === 0 ? 'No hay técnicos disponibles' : 'Sin asignar (podés asignar después)'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin asignar</SelectItem>
                {tecnicos.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre} {t.email ? `(${t.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" loading={isSubmitting} disabled={operarioSinJuzgado}>
              Crear Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

