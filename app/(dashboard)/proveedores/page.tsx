'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Phone, Mail, Building2, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { proveedoresApi } from '@/lib/api';
import type { Proveedor } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const ROLES_CAN_EDIT = ['admin', 'operario'];
const ROLES_TECNICOS = ['tecnico_interno', 'tecnico_proveedor'];

export default function ProveedoresPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.rol && ROLES_CAN_EDIT.includes(user.rol);
  const isTecnico = user?.rol && ROLES_TECNICOS.includes(user.rol);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<Proveedor | null>(null);
  const [creatingProveedor, setCreatingProveedor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ nombre: '', cuit: '', telefono: '', email: '', contacto: '' });

  useEffect(() => {
    if (isTecnico) router.replace('/tickets');
  }, [isTecnico, router]);

  useEffect(() => {
    if (isTecnico) return;
    proveedoresApi
      .list()
      .then((res) => setProveedores(res.data.data ?? []))
      .catch(() => setProveedores(MOCK_PROVEEDORES))
      .finally(() => setLoading(false));
  }, [isTecnico]);

  const filtered = search ? proveedores.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase())) : proveedores;

  const load = () => {
    proveedoresApi
      .list()
      .then((res) => setProveedores(res.data.data ?? []))
      .catch(() => setProveedores(MOCK_PROVEEDORES));
  };

  const openNew = () => {
    setCreatingProveedor(true);
    setEditItem(null);
    setEditForm({ nombre: '', cuit: '', telefono: '', email: '', contacto: '' });
  };

  const openEdit = (p: Proveedor) => {
    setEditItem(p);
    setCreatingProveedor(false);
    setEditForm({
      nombre: p.nombre,
      cuit: p.cuit ?? '',
      telefono: p.telefono ?? '',
      email: p.email ?? '',
      contacto: p.contacto ?? '',
    });
  };

  const handleSaveProveedor = async () => {
    if (!editForm.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await proveedoresApi.update(editItem.id, {
          nombre: editForm.nombre.trim(),
          cuit: editForm.cuit.trim() || undefined,
          telefono: editForm.telefono.trim() || undefined,
          email: editForm.email.trim() || undefined,
          contacto: editForm.contacto.trim() || undefined,
        });
        toast.success('Proveedor actualizado');
      } else {
        await proveedoresApi.create({
          nombre: editForm.nombre.trim(),
          cuit: editForm.cuit.trim() || undefined,
          telefono: editForm.telefono.trim() || undefined,
          email: editForm.email.trim() || undefined,
          contacto: editForm.contacto.trim() || undefined,
        });
        toast.success('Proveedor creado');
      }
      setEditItem(null);
      setCreatingProveedor(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProveedor = async (p: Proveedor) => {
    if (!window.confirm(`¿Eliminar el proveedor "${p.nombre}"?`)) return;
    try {
      await proveedoresApi.delete(p.id);
      toast.success('Proveedor eliminado');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Error al eliminar');
    }
  };

  if (isTecnico) return null;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 w-full">
        <div className="relative flex-1 min-w-44 max-w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar proveedores…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        {canEdit && (
          <div className="ml-auto">
            <Button size="sm" onClick={openNew}>
              <Plus className="w-4 h-4" />
              Nuevo Proveedor
            </Button>
          </div>
        )}
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="h-4 bg-secondary rounded animate-pulse w-3/4" />
              <div className="h-3 bg-secondary rounded animate-pulse w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow group relative"
            >
              {canEdit && (
                <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.preventDefault();
                      openEdit(p);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteProveedor(p);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">{p.nombre}</p>
                    {!p.activo && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">Inactivo</span>
                    )}
                  </div>
                  {p.cuit && <p className="text-xs text-muted-foreground">CUIT: {p.cuit}</p>}
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                {p.telefono && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    {p.telefono}
                  </div>
                )}
                {p.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    {p.email}
                  </div>
                )}
                {p.contacto && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-3 h-3 text-center">👤</span>
                    {p.contacto}
                  </div>
                )}
              </div>

              {p.contratos && p.contratos.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {p.contratos.length} contrato{p.contratos.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <Dialog
        open={!!editItem || creatingProveedor}
        onOpenChange={(open) => {
          if (!open) {
            setEditItem(null);
            setCreatingProveedor(false);
          }
        }}
      >
        <DialogContent className="max-w-lg p-0">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">{creatingProveedor ? 'Nuevo proveedor' : 'Editar proveedor'}</h3>
          </div>
          {(editItem || creatingProveedor) && (
            <div className="px-6 py-5 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nombre <span className="text-destructive">*</span></label>
                <Input
                  value={editForm.nombre}
                  onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="h-9 text-sm"
                  maxLength={150}
                  placeholder="Máx. 150 caracteres"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">CUIT</label>
                <Input
                  value={editForm.cuit}
                  onChange={(e) => setEditForm((f) => ({ ...f, cuit: e.target.value }))}
                  className="h-9 text-sm"
                  maxLength={20}
                  placeholder="Máx. 20 caracteres"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Teléfono</label>
                <Input
                  value={editForm.telefono}
                  onChange={(e) => setEditForm((f) => ({ ...f, telefono: e.target.value }))}
                  className="h-9 text-sm"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-9 text-sm"
                  maxLength={254}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Contacto</label>
                <Input
                  value={editForm.contacto}
                  onChange={(e) => setEditForm((f) => ({ ...f, contacto: e.target.value }))}
                  className="h-9 text-sm"
                  maxLength={150}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <DialogClose asChild>
                  <Button variant="outline" size="sm">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button size="sm" loading={saving} onClick={handleSaveProveedor}>
                  {creatingProveedor ? 'Crear' : 'Guardar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const MOCK_PROVEEDORES: Proveedor[] = [
  {
    id: 1,
    nombre: 'InfoJudicial S.A.',
    cuit: '30-71234567-8',
    telefono: '011 4321-5678',
    email: 'soporte@infojudicial.com.ar',
    contacto: 'Jorge Martínez',
    activo: true,
  },
  { id: 2, nombre: 'Telecom Argentina', cuit: '30-70712809-5', telefono: '0800-555-2222', email: 'empresas@telecom.com.ar', activo: true },
  { id: 3, nombre: 'TechCorp SRL', cuit: '30-65987432-1', telefono: '011 4555-9090', email: 'ventas@techcorp.com.ar', contacto: 'Ana Rodríguez', activo: true },
  { id: 4, nombre: 'SecureIT', cuit: '33-71098765-9', email: 'info@secureit.com.ar', activo: true },
  { id: 5, nombre: 'HP Argentina', cuit: '30-68234567-4', telefono: '0800-333-4726', email: 'support@hp.com', activo: true },
];

