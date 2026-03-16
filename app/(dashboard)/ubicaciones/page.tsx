'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, MapPin, Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ubicacionesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

type UbicacionTipo = 'circunscripcion' | 'distrito' | 'juzgado' | 'puesto';

const TIPOS_JUZGADO = ['Juzgado', 'Camara', 'Secretaria', 'Otro'];

interface Circunscripcion {
  id: number;
  codigo: string;
  nombre: string;
  distritos?: Distrito[];
  districts?: Distrito[]; // camelCase desde backend
}

interface Distrito {
  id: number;
  codigo: string;
  nombre: string;
  edificio?: string;
  direccion?: string;
  juzgados?: Juzgado[];
  courts?: Juzgado[]; // camelCase desde backend
}

interface Juzgado {
  id: number;
  codigo: string;
  nombre: string;
  tipo?: string;
}

interface Puesto {
  id: number;
  numero: number | string;
  descripcion?: string;
}

/** Normaliza el árbol para que siempre tenga distritos y juzgados como arrays (soporta snake_case y camelCase del backend). */
function normalizeTree(raw: Circunscripcion[]): Circunscripcion[] {
  return (raw ?? []).map((c) => {
    const distritosRaw = c.distritos ?? c.districts ?? [];
    const distritos: Distrito[] = distritosRaw.map((d: Distrito) => {
      const juzgadosRaw = d.juzgados ?? d.courts ?? [];
      return {
        id: d.id,
        codigo: d.codigo,
        nombre: d.nombre,
        edificio: d.edificio,
        direccion: d.direccion,
        juzgados: juzgadosRaw.map((j: Juzgado) => ({ id: j.id, codigo: j.codigo, nombre: j.nombre, tipo: j.tipo })),
      };
    });
    return {
      id: c.id,
      codigo: c.codigo,
      nombre: c.nombre,
      distritos,
    };
  });
}

export default function UbicacionesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'admin';
  const [tree, setTree] = useState<Circunscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCirc, setExpandedCirc] = useState<Set<number>>(new Set());
  const [expandedDist, setExpandedDist] = useState<Set<number>>(new Set());
  const [expandedJuzgado, setExpandedJuzgado] = useState<Set<number>>(new Set());
  const [puestosByJuzgado, setPuestosByJuzgado] = useState<Record<number, Puesto[]>>({});
  const [loadingPuestos, setLoadingPuestos] = useState<Set<number>>(new Set());

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    type: 'circunscripcion' | 'distrito' | 'juzgado';
    id: number;
    distritoId?: number;
    circunscripcionId?: number;
  } | null>(null);
  const [tipoUbicacion, setTipoUbicacion] = useState<UbicacionTipo>('circunscripcion');
  const [saving, setSaving] = useState(false);
  const [distritosFlat, setDistritosFlat] = useState<Distrito[]>([]);
  const [juzgadosFlat, setJuzgadosFlat] = useState<Juzgado[]>([]);

  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    circunscripcion_id: '',
    edificio: '',
    direccion: '',
    distrito_id: '',
    tipo: '',
    piso: '',
    juzgado_id: '',
    numero: '',
  });

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ubicacionesApi.circunscripciones();
      let data = res.data?.data ?? res.data ?? [];
      if (!Array.isArray(data)) data = [];
      let nextTree = normalizeTree(data as Circunscripcion[]);

      try {
        const juzRes = await ubicacionesApi.juzgados();
        const juzgadosList = (juzRes.data?.data ?? juzRes.data ?? []) as (Juzgado & { distrito_id?: number; distritoId?: number })[];
        if (Array.isArray(juzgadosList) && juzgadosList.length > 0) {
          const byDistrito = new Map<number, Juzgado[]>();
          for (const j of juzgadosList) {
            const distritoId = j.distrito_id ?? j.distritoId;
            if (distritoId != null) {
              if (!byDistrito.has(distritoId)) byDistrito.set(distritoId, []);
              byDistrito.get(distritoId)!.push({ id: j.id, codigo: j.codigo, nombre: j.nombre, tipo: j.tipo });
            }
          }
          nextTree = nextTree.map((c) => ({
            ...c,
            distritos: (c.distritos ?? []).map((d) => ({
              ...d,
              juzgados: byDistrito.get(d.id) ?? d.juzgados ?? [],
            })),
          }));
        }
      } catch {
        // si el backend no devuelve juzgados o falla, el árbol ya tiene lo que vino en circunscripciones
      }

      setTree(nextTree);
    } catch {
      setTree(normalizeTree(MOCK_TREE));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    const distritos = tree.flatMap((c) => c.distritos ?? []);
    setDistritosFlat(distritos);
    setJuzgadosFlat(distritos.flatMap((d) => d.juzgados ?? []));
  }, [tree]);

  const openModal = () => {
    setEditTarget(null);
    setTipoUbicacion('circunscripcion');
    setForm({
      codigo: '',
      nombre: '',
      descripcion: '',
      circunscripcion_id: '',
      edificio: '',
      direccion: '',
      distrito_id: '',
      tipo: '',
      piso: '',
      juzgado_id: '',
      numero: '',
    });
    setShowModal(true);
  };

  const openEditCircunscripcion = (c: Circunscripcion, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTarget({ type: 'circunscripcion', id: c.id });
    setTipoUbicacion('circunscripcion');
    setForm({
      codigo: c.codigo,
      nombre: c.nombre,
      descripcion: '',
      circunscripcion_id: '',
      edificio: '',
      direccion: '',
      distrito_id: '',
      tipo: '',
      piso: '',
      juzgado_id: '',
      numero: '',
    });
    setShowModal(true);
  };

  const openEditDistrito = (dist: Distrito, e: React.MouseEvent) => {
    e.stopPropagation();
    const circ = tree.find((c) => c.distritos?.some((d) => d.id === dist.id));
    setEditTarget({ type: 'distrito', id: dist.id });
    setTipoUbicacion('distrito');
    setForm({
      codigo: dist.codigo,
      nombre: dist.nombre,
      descripcion: '',
      circunscripcion_id: circ ? String(circ.id) : '',
      edificio: dist.edificio ?? '',
      direccion: dist.direccion ?? '',
      distrito_id: '',
      tipo: '',
      piso: '',
      juzgado_id: '',
      numero: '',
    });
    setShowModal(true);
  };

  const openEditJuzgado = (j: Juzgado, distritoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTarget({ type: 'juzgado', id: j.id, distritoId });
    setTipoUbicacion('juzgado');
    setForm({
      codigo: j.codigo,
      nombre: j.nombre,
      descripcion: '',
      circunscripcion_id: '',
      edificio: '',
      direccion: '',
      distrito_id: String(distritoId),
      tipo: j.tipo ?? '',
      piso: '',
      juzgado_id: '',
      numero: '',
    });
    setShowModal(true);
  };

  const handleDeleteCircunscripcion = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Dar de baja esta circunscripción? (soft delete)')) return;
    try {
      await ubicacionesApi.deleteCircunscripcion(id);
      toast.success('Circunscripción dada de baja');
      loadTree();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteDistrito = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Dar de baja este distrito? (soft delete)')) return;
    try {
      await ubicacionesApi.deleteDistrito(id);
      toast.success('Distrito dado de baja');
      loadTree();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteJuzgado = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Dar de baja este juzgado? (soft delete)')) return;
    try {
      await ubicacionesApi.deleteJuzgado(id);
      toast.success('Juzgado dado de baja');
      loadTree();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const getErrorMessage = (err: unknown): string => {
    const data = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
    const msg = data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(' ');
    return 'Error al crear';
  };

  const handleSubmit = async () => {
    if (tipoUbicacion === 'circunscripcion') {
      if (!form.nombre.trim()) {
        toast.error('Nombre es obligatorio');
        return;
      }
      setSaving(true);
      try {
        if (editTarget?.type === 'circunscripcion') {
          await ubicacionesApi.updateCircunscripcion(editTarget.id, {
            nombre: form.nombre.trim(),
            descripcion: form.descripcion.trim() || undefined,
          });
          toast.success('Circunscripción actualizada');
        } else {
          if (!form.codigo.trim()) {
            toast.error('Código y nombre son obligatorios');
            setSaving(false);
            return;
          }
          await ubicacionesApi.createCircunscripcion({
            codigo: form.codigo.trim(),
            nombre: form.nombre.trim(),
            descripcion: form.descripcion.trim() || undefined,
          });
          toast.success('Circunscripción creada');
        }
        setShowModal(false);
        setEditTarget(null);
        loadTree();
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setSaving(false);
      }
      return;
    }
    if (tipoUbicacion === 'distrito') {
      if (!form.nombre.trim()) {
        toast.error('Nombre es obligatorio');
        return;
      }
      setSaving(true);
      try {
        if (editTarget?.type === 'distrito') {
          await ubicacionesApi.updateDistrito(editTarget.id, {
            nombre: form.nombre.trim(),
            edificio: form.edificio.trim() || undefined,
            direccion: form.direccion.trim() || undefined,
          });
          toast.success('Distrito actualizado');
        } else {
          if (!form.circunscripcion_id || !form.codigo.trim()) {
            toast.error('Circunscripción, código y nombre son obligatorios');
            setSaving(false);
            return;
          }
          await ubicacionesApi.createDistrito({
            circunscripcion_id: Number(form.circunscripcion_id),
            codigo: form.codigo.trim(),
            nombre: form.nombre.trim(),
            edificio: form.edificio.trim() || undefined,
            direccion: form.direccion.trim() || undefined,
          });
          toast.success('Distrito creado');
        }
        setShowModal(false);
        setEditTarget(null);
        loadTree();
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setSaving(false);
      }
      return;
    }
    if (tipoUbicacion === 'juzgado') {
      if (!form.nombre.trim()) {
        toast.error('Nombre es obligatorio');
        return;
      }
      setSaving(true);
      try {
        if (editTarget?.type === 'juzgado') {
          await ubicacionesApi.updateJuzgado(editTarget.id, {
            nombre: form.nombre.trim(),
            piso: form.piso.trim() || undefined,
          });
          toast.success('Juzgado actualizado');
        } else {
          if (!form.distrito_id || !form.codigo.trim()) {
            toast.error('Distrito, código y nombre son obligatorios');
            setSaving(false);
            return;
          }
          await ubicacionesApi.createJuzgado({
            distrito_id: Number(form.distrito_id),
            codigo: form.codigo.trim(),
            nombre: form.nombre.trim(),
            tipo: form.tipo.trim() || undefined,
            piso: form.piso.trim() || undefined,
          });
          toast.success('Juzgado creado');
        }
        setShowModal(false);
        setEditTarget(null);
        loadTree();
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setSaving(false);
      }
      return;
    }
    if (tipoUbicacion === 'puesto') {
      if (!form.juzgado_id || form.numero === '') {
        toast.error('Juzgado y número son obligatorios');
        return;
      }
      const num = Number(form.numero);
      if (Number.isNaN(num) || num < 1) {
        toast.error('Número debe ser un entero positivo');
        return;
      }
      setSaving(true);
      try {
        await ubicacionesApi.createPuesto(Number(form.juzgado_id), {
          numero: num,
          descripcion: form.descripcion.trim() || undefined,
        });
        toast.success('Puesto creado');
        setShowModal(false);
        loadTree();
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setSaving(false);
      }
    }
  };

  const toggleCirc = (id: number) => {
    setExpandedCirc((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleDist = (id: number) => {
    setExpandedDist((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleJuzgado = (id: number) => {
    setExpandedJuzgado((prev) => {
      const next = new Set(prev);
      const isExpanding = !next.has(id);
      if (isExpanding) next.add(id);
      else next.delete(id);
      if (isExpanding && !puestosByJuzgado[id]) {
        setLoadingPuestos((p) => new Set(p).add(id));
        ubicacionesApi
          .puestos(id)
          .then((res) => {
            const data = res.data?.data ?? res.data ?? [];
            const list = Array.isArray(data) ? (data as Puesto[]) : [];
            setPuestosByJuzgado((prev) => ({ ...prev, [id]: list }));
          })
          .catch(() => setPuestosByJuzgado((prev) => ({ ...prev, [id]: [] })))
          .finally(() =>
            setLoadingPuestos((p) => {
              const n = new Set(p);
              n.delete(id);
              return n;
            }),
          );
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between w-full">
        <p className="text-sm text-muted-foreground">Jerarquía: Circunscripción → Distrito → Juzgado → Puesto</p>
        {isAdmin && (
          <Button size="sm" onClick={openModal}>
            <Plus className="w-4 h-4" /> Nueva Ubicación
          </Button>
        )}
      </div>

      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
          setShowModal(open);
        }}
      >
        <DialogContent className="max-w-lg p-0">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">
              {editTarget
                ? editTarget.type === 'circunscripcion'
                  ? 'Editar circunscripción'
                  : editTarget.type === 'distrito'
                    ? 'Editar distrito'
                    : 'Editar juzgado'
                : 'Nueva ubicación'}
            </h3>
          </div>
          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Tipo <span className="text-destructive">*</span>
              </label>
              <Select value={tipoUbicacion} onValueChange={(v) => setTipoUbicacion(v as UbicacionTipo)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="circunscripcion">Circunscripción</SelectItem>
                  <SelectItem value="distrito">Distrito</SelectItem>
                  <SelectItem value="juzgado">Juzgado</SelectItem>
                  <SelectItem value="puesto">Puesto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoUbicacion === 'circunscripcion' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Código {!editTarget?.type && <span className="text-destructive">*</span>}</label>
                  <Input
                    value={form.codigo}
                    onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                    className="h-9 text-sm font-mono"
                    placeholder="Ej. C1"
                    maxLength={20}
                    disabled={editTarget?.type === 'circunscripcion'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Nombre <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Ej. Primera Circunscripción"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Descripción</label>
                  <Input
                    value={form.descripcion}
                    onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Opcional"
                  />
                </div>
              </>
            )}

            {tipoUbicacion === 'distrito' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Circunscripción {!editTarget?.type && <span className="text-destructive">*</span>}
                  </label>
                  <Select value={form.circunscripcion_id} onValueChange={(v) => setForm((f) => ({ ...f, circunscripcion_id: v }))}>
                    <SelectTrigger className="h-9 text-sm" disabled={editTarget?.type === 'distrito'}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {tree.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombre} ({c.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Código {!editTarget?.type && <span className="text-destructive">*</span>}</label>
                  <Input
                    value={form.codigo}
                    onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                    className="h-9 text-sm font-mono"
                    placeholder="Ej. D1"
                    maxLength={20}
                    disabled={editTarget?.type === 'distrito'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Nombre <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Ej. Distrito Centro"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Edificio</label>
                  <Input
                    value={form.edificio}
                    onChange={(e) => setForm((f) => ({ ...f, edificio: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Opcional"
                    maxLength={150}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Dirección</label>
                  <Input
                    value={form.direccion}
                    onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Opcional"
                  />
                </div>
              </>
            )}

            {tipoUbicacion === 'juzgado' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Distrito {!editTarget?.type && <span className="text-destructive">*</span>}</label>
                  <Select value={form.distrito_id} onValueChange={(v) => setForm((f) => ({ ...f, distrito_id: v }))}>
                    <SelectTrigger className="h-9 text-sm" disabled={editTarget?.type === 'juzgado'}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {distritosFlat.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.nombre} ({d.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Código {!editTarget?.type && <span className="text-destructive">*</span>}</label>
                  <Input
                    value={form.codigo}
                    onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                    className="h-9 text-sm font-mono"
                    placeholder="Ej. JC01"
                    maxLength={20}
                    disabled={editTarget?.type === 'juzgado'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Nombre <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Ej. Juzgado Civil N°1"
                    maxLength={150}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Tipo</label>
                  <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_JUZGADO.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Piso</label>
                  <Input value={form.piso} onChange={(e) => setForm((f) => ({ ...f, piso: e.target.value }))} className="h-9 text-sm" placeholder="Opcional" />
                </div>
              </>
            )}

            {tipoUbicacion === 'puesto' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Juzgado <span className="text-destructive">*</span>
                  </label>
                  <Select value={form.juzgado_id} onValueChange={(v) => setForm((f) => ({ ...f, juzgado_id: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {juzgadosFlat.map((j) => (
                        <SelectItem key={j.id} value={String(j.id)}>
                          {j.nombre} ({j.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Número <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={form.numero}
                    onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Número de puesto"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Descripción</label>
                  <Input
                    value={form.descripcion}
                    onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Opcional"
                    maxLength={100}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button variant="outline" size="sm">
                  Cancelar
                </Button>
              </DialogClose>
              <Button size="sm" loading={saving} onClick={handleSubmit}>
                {editTarget ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tree.map((circ, i) => (
            <motion.div
              key={circ.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              {/* Circunscripción */}
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={() => toggleCirc(circ.id)}
                  className="flex-1 flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left min-w-0"
                >
                  <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0', expandedCirc.has(circ.id) && 'rotate-90')} />
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground">{circ.nombre}</span>
                    <span className="text-xs text-muted-foreground ml-2">({circ.codigo})</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {circ.distritos?.length ?? 0} distrito{circ.distritos?.length !== 1 ? 's' : ''}
                  </span>
                </button>
                {isAdmin && (
                  <div className="flex items-center gap-0.5 shrink-0 pr-2">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => openEditCircunscripcion(circ, e)}>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => handleDeleteCircunscripcion(circ.id, e)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Distritos */}
              {expandedCirc.has(circ.id) && (
                <div className="border-t border-border bg-secondary/20">
                  {circ.distritos?.map((dist) => (
                    <div key={dist.id}>
                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => toggleDist(dist.id)}
                          className="flex-1 flex items-center gap-3 px-6 py-3 hover:bg-secondary/50 transition-colors text-left min-w-0"
                        >
                          <ChevronRight
                            className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0', expandedDist.has(dist.id) && 'rotate-90')}
                          />
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground">{dist.nombre}</span>
                            {dist.direccion && <span className="text-xs text-muted-foreground ml-2">{dist.direccion}</span>}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {dist.juzgados?.length ?? 0} juzgado{dist.juzgados?.length !== 1 ? 's' : ''}
                          </span>
                        </button>
                        {isAdmin && (
                          <div className="flex items-center gap-0.5 shrink-0 pr-2">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => openEditDistrito(dist, e)}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={(e) => handleDeleteDistrito(dist.id, e)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Juzgados */}
                      {expandedDist.has(dist.id) && dist.juzgados && (
                        <div className="bg-card border-t border-border/50">
                          {dist.juzgados.map((j) => (
                            <div key={j.id}>
                              <div className="flex items-center w-full gap-2 border-b border-border/30 last:border-0">
                                <button
                                  type="button"
                                  onClick={() => toggleJuzgado(j.id)}
                                  className="flex flex-1 items-center gap-3 px-10 py-2.5 hover:bg-secondary/30 text-left min-w-0"
                                >
                                  <ChevronRight
                                    className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0', expandedJuzgado.has(j.id) && 'rotate-90')}
                                  />
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                                  <span className="text-sm text-foreground flex-1 min-w-0 truncate">{j.nombre}</span>
                                  {j.tipo && <span className="text-xs text-muted-foreground shrink-0">{j.tipo}</span>}
                                  <span className="font-mono text-xs text-muted-foreground/60 shrink-0">{j.codigo}</span>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {loadingPuestos.has(j.id) ? '…' : (puestosByJuzgado[j.id]?.length ?? 0)} puesto
                                    {(puestosByJuzgado[j.id]?.length ?? 0) !== 1 ? 's' : ''}
                                  </span>
                                </button>
                                {isAdmin && (
                                  <div className="flex items-center gap-0.5 shrink-0 pr-3 py-2.5">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => openEditJuzgado(j, dist.id, e)}>
                                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      onClick={(e) => handleDeleteJuzgado(j.id, e)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              {expandedJuzgado.has(j.id) && (
                                <div className="bg-secondary/10 border-b border-border/20">
                                  {loadingPuestos.has(j.id) ? (
                                    <div className="px-14 py-3 text-xs text-muted-foreground">Cargando puestos…</div>
                                  ) : (puestosByJuzgado[j.id]?.length ?? 0) === 0 ? (
                                    <div className="px-14 py-3 text-xs text-muted-foreground">Sin puestos</div>
                                  ) : (
                                    <ul className="py-1">
                                      {(puestosByJuzgado[j.id] ?? []).map((p) => (
                                        <li
                                          key={p.id}
                                          className="flex items-center gap-3 px-14 py-2 text-sm text-foreground border-b border-border/10 last:border-0"
                                        >
                                          <span className="font-mono text-xs text-muted-foreground w-8">Nº {p.numero}</span>
                                          <span className="text-muted-foreground">{p.descripcion ?? '—'}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

const MOCK_TREE: Circunscripcion[] = [
  {
    id: 1,
    codigo: 'C1',
    nombre: '1ra Circunscripción',
    distritos: [
      {
        id: 1,
        codigo: 'D1',
        nombre: 'Capital',
        edificio: 'Palacio de Justicia',
        direccion: 'Amenábar 2551',
        juzgados: [
          { id: 1, codigo: 'JC01', nombre: 'Juzgado Civil y Comercial N°1', tipo: 'Juzgado' },
          { id: 2, codigo: 'JC02', nombre: 'Juzgado Civil y Comercial N°2', tipo: 'Juzgado' },
          { id: 3, codigo: 'CAM1', nombre: 'Cámara de Apelaciones Civil', tipo: 'Camara' },
        ],
      },
      {
        id: 2,
        codigo: 'D2',
        nombre: 'Rosario',
        edificio: 'Centro de Justicia Rosario',
        juzgados: [{ id: 4, codigo: 'JCR1', nombre: 'Juzgado Civil Rosario N°1', tipo: 'Juzgado' }],
      },
    ],
  },
  {
    id: 2,
    codigo: 'C2',
    nombre: '2da Circunscripción',
    distritos: [
      {
        id: 3,
        codigo: 'D3',
        nombre: 'Venado Tuerto',
        juzgados: [{ id: 5, codigo: 'JCVT', nombre: 'Juzgado Civil Venado Tuerto', tipo: 'Juzgado' }],
      },
    ],
  },
];

