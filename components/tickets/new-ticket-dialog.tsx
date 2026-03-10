'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ticketsApi, ubicacionesApi, usuariosApi, equiposApi } from '@/lib/api';
import type { User, Equipo } from '@/lib/api';

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

const schema = z.object({
  tipo: z.enum(['Hardware', 'Software', 'Red', 'Otro']),
  asunto: z.string().min(5, 'Mínimo 5 caracteres').max(255),
  descripcion: z.string().optional(),
  prioridad: z.enum(['Critica', 'Alta', 'Media', 'Baja']),
  juzgado_id: z.string().min(1, 'Seleccioná un juzgado'),
  equipo_id: z.string().refine((v) => v && v !== '__none__' && !Number.isNaN(parseInt(v, 10)), 'Seleccioná un equipo'),
  asignado_a_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewTicketDialog({ open, onClose, onSuccess }: Props) {
  const [juzgados, setJuzgados] = useState<{ id: number; nombre: string }[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
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
    defaultValues: { tipo: 'Hardware', prioridad: 'Media', equipo_id: '__none__' },
  });

  const tipo = watch('tipo');
  const juzgadoId = watch('juzgado_id');

  useEffect(() => {
    if (open) {
      ubicacionesApi
        .juzgados()
        .then((res) => {
          setJuzgados(res.data.data ?? []);
        })
        .catch(() => {
          setJuzgados([
            { id: 1, nombre: 'Juzgado Civil 1' },
            { id: 2, nombre: 'Juzgado Civil 2' },
            { id: 3, nombre: 'Cámara Penal' },
            { id: 4, nombre: 'Tribunal Oral' },
            { id: 5, nombre: 'Secretaría General' },
          ]);
        });
      equiposApi
        .list({ per_page: 200, page: 1 })
        .then((res) => setEquipos(res.data.data ?? []))
        .catch(() => setEquipos([]));
    }
  }, [open]);

  // Cargar técnicos al abrir el modal (y al cambiar juzgado) para que el GET se dispare y el dropdown tenga opciones
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
    try {
      const payload = {
        tipo: data.tipo,
        asunto: data.asunto.trim(),
        prioridad: data.prioridad,
        juzgado_id: juzgadoIdNum,
        equipo_id: equipoIdNum,
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Nuevo Ticket" description="Completá los datos del incidente o solicitud" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Tipo + Prioridad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Tipo <span className="text-danger">*</span>
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
                Prioridad <span className="text-danger">*</span>
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

          {/* Asunto */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Asunto <span className="text-danger">*</span>
            </label>
            <Input {...register('asunto')} placeholder={ph.asunto} error={!!errors.asunto} />
            {errors.asunto && <p className="text-xs text-danger">{errors.asunto.message}</p>}
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Descripción</label>
            <Textarea {...register('descripcion')} placeholder={ph.desc} rows={3} />
          </div>

          {/* Juzgado */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Juzgado <span className="text-danger">*</span>
            </label>
            <Select value={watch('juzgado_id') ?? ''} onValueChange={(v) => setValue('juzgado_id', v)}>
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

          {/* Equipo (requerido por el backend) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Equipo <span className="text-danger">*</span>
            </label>
            <Select value={watch('equipo_id') ?? '__none__'} onValueChange={(v) => setValue('equipo_id', v)}>
              <SelectTrigger error={!!errors.equipo_id}>
                <SelectValue placeholder={equipos.length === 0 ? 'Cargando equipos…' : 'Seleccioná el equipo…'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Seleccioná el equipo…</SelectItem>
                {equipos.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.nro_inventario} — {e.clase}
                    {e.puesto?.juzgado?.nombre ? ` (${e.puesto.juzgado.nombre})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.equipo_id && <p className="text-xs text-danger">{errors.equipo_id.message}</p>}
          </div>

          {/* Asignar a (opcional) */}
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

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" loading={isSubmitting}>
              Crear Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

