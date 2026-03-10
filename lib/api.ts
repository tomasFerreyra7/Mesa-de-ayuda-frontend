import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

// URL del backend: se lee de .env.local (NEXT_PUBLIC_API_URL). Reiniciar "npm run dev" al cambiar.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: añade el JWT (desde el store para estar en sync con persist)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().token ?? localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: 401 → cerrar sesión en store + persist y redirigir a login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ─── Helpers para desempaquetar la respuesta del backend ──
export function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data;
}

export function unwrapList<T>(response: { data: { data: T[]; meta: PaginationMeta } }): { items: T[]; meta: PaginationMeta } {
  return { items: response.data.data, meta: response.data.meta };
}

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// ─── ENDPOINTS ────────────────────────────────────────────

// Auth (backend devuelve { data: { token, usuario } })
interface LoginResponsePayload {
  token?: string;
  access_token?: string;
  usuario?: User;
  user?: User;
}
export const authApi = {
  login: (email: string, password: string) => api.post<{ data?: LoginResponsePayload }>('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<{ data: User }>('/auth/me'),
  changePassword: (password_actual: string, password_nuevo: string) => api.patch('/auth/me/password', { password_actual, password_nuevo }),
};

// Dashboard
export const dashboardApi = {
  kpis: () => api.get<{ data: DashboardKPIs }>('/dashboard/kpis'),
  alertas: () => api.get<{ data: Alerta[] }>('/dashboard/alertas'),
};

// Tickets
export const ticketsApi = {
  list: (params?: TicketFilters) => api.get('/tickets', { params }),
  get: (id: number) => api.get(`/tickets/${id}`),
  create: (data: CreateTicketDto) => api.post('/tickets', data),
  update: (id: number, data: Partial<CreateTicketDto>) => api.patch(`/tickets/${id}`, data),
  changeEstado: (id: number, estado: string, comentario?: string) => api.patch(`/tickets/${id}/estado`, { estado, comentario }),
  asignar: (id: number, tecnico_id: number) => api.patch(`/tickets/${id}/asignar`, { tecnico_id }),
  delete: (id: number) => api.delete(`/tickets/${id}`),
  comentarios: (id: number) => api.get(`/tickets/${id}/comentarios`),
  addComentario: (id: number, texto: string, interno?: boolean) => api.post(`/tickets/${id}/comentarios`, { texto, interno }),
  historial: (id: number) => api.get(`/tickets/${id}/historial`),
};

// Equipos
export const equiposApi = {
  list: (params?: EquipoFilters) => api.get('/equipos', { params }),
  get: (id: number) => api.get(`/equipos/${id}`),
  create: (data: CreateEquipoDto) => api.post('/equipos', data),
  update: (id: number, data: Partial<CreateEquipoDto>) => api.patch(`/equipos/${id}`, data),
  reubicar: (id: number, puesto_id: number | null) => api.patch(`/equipos/${id}/reubicar`, { puesto_id }),
  delete: (id: number) => api.delete(`/equipos/${id}`),
};

// Software
export const softwareApi = {
  list: (params?: Record<string, unknown>) => api.get('/software', { params }),
  get: (id: number) => api.get(`/software/${id}`),
  create: (data: CreateSoftwareDto) => api.post('/software', data),
  update: (id: number, data: Partial<CreateSoftwareDto>) => api.patch(`/software/${id}`, data),
  delete: (id: number) => api.delete(`/software/${id}`),
  instalaciones: (id: number) => api.get(`/software/${id}/instalaciones`),
  instalar: (id: number, equipo_id: number, version_inst?: string, fecha_inst?: string) =>
    api.post(`/software/${id}/instalaciones`, { equipo_id, version_inst, fecha_inst }),
  desinstalar: (softwareId: number, equipoId: number) => api.delete(`/software/${softwareId}/instalaciones/${equipoId}`),
};

// Contratos
export const contratosApi = {
  list: (params?: Record<string, unknown>) => api.get('/contratos', { params }),
  get: (id: number) => api.get(`/contratos/${id}`),
  create: (data: CreateContratoDto) => api.post('/contratos', data),
  update: (id: number, data: Partial<CreateContratoDto>) => api.patch(`/contratos/${id}`, data),
  delete: (id: number) => api.delete(`/contratos/${id}`),
};

// Proveedores
export const proveedoresApi = {
  list: () => api.get('/proveedores'),
  get: (id: number) => api.get(`/proveedores/${id}`),
  create: (data: CreateProveedorDto) => api.post('/proveedores', data),
  update: (id: number, data: Partial<CreateProveedorDto>) => api.patch(`/proveedores/${id}`, data),
  delete: (id: number) => api.delete(`/proveedores/${id}`),
};

// Ubicaciones
export const ubicacionesApi = {
  circunscripciones: () => api.get('/ubicaciones/circunscripciones'),
  distritos: (params?: { circunscripcion_id?: number }) => api.get('/ubicaciones/distritos', { params }),
  juzgados: (params?: { q?: string; distrito_id?: number }) => api.get('/ubicaciones/juzgados', { params }),
  juzgado: (id: number) => api.get(`/ubicaciones/juzgados/${id}`),
  puestos: (juzgadoId: number) => api.get(`/ubicaciones/juzgados/${juzgadoId}/puestos`),
};

// Usuarios
export const usuariosApi = {
  list: (params?: { q?: string; rol?: string; activo?: boolean }) => api.get('/usuarios', { params }),
  tecnicosDisponibles: (juzgado_id?: number) => api.get('/usuarios/tecnicos/disponibles', { params: { juzgado_id } }),
  get: (id: number) => api.get(`/usuarios/${id}`),
  create: (data: CreateUsuarioDto) => api.post('/usuarios', data),
  update: (id: number, data: Partial<CreateUsuarioDto>) => api.patch(`/usuarios/${id}`, data),
  delete: (id: number) => api.delete(`/usuarios/${id}`),
};

// Notificaciones
export const notificacionesApi = {
  list: (params?: { leida?: boolean; tipo?: string }) => api.get('/notificaciones', { params }),
  markRead: (id: number) => api.patch(`/notificaciones/${id}`, { leida: true }),
  delete: (id: number) => api.delete(`/notificaciones/${id}`),
};

// ─── TIPOS ─────────────────────────────────────────────────

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'operario' | 'tecnico_interno' | 'tecnico_proveedor';
  iniciales?: string;
  avatarColor?: string;
  activo: boolean;
}

export interface DashboardKPIs {
  ticketsAbiertos: number;
  ticketsEnProgreso: number;
  ticketsCriticos: number;
  ticketsResueltosSemana: number;
  equiposActivos: number;
  equiposMantenimiento: number;
  softwarePorVencer: number;
  contratosPorVencer: number;
  slaCompliance: number;
  tiempoPromedioResolucion: number;
}

export interface Alerta {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  severidad: 'info' | 'warning' | 'danger';
  fecha: string;
}

export interface Ticket {
  id: number;
  nroTicket: string;
  tipo: 'Hardware' | 'Software' | 'Red' | 'Otro';
  asunto: string;
  descripcion?: string;
  estado: 'Abierto' | 'En Progreso' | 'Resuelto' | 'Cerrado';
  prioridad: 'Critica' | 'Alta' | 'Media' | 'Baja';
  creadoPorId: number;
  asignadoAId?: number;
  juzgadoId: number;
  equipoId?: number;
  softwareId?: number;
  fechaCreacion: string;
  fechaAsig?: string;
  fechaResol?: string;
  fechaCierre?: string;
  slaVenceEn?: string;
  slaCumplido?: boolean;
  updatedAt: string;
  creadoPor?: User;
  asignadoA?: User;
  juzgado?: { id: number; nombre: string };
  equipo?: { id: number; nro_inventario: string; clase: string };
  software?: { id: number; nombre: string };
}

export interface Equipo {
  id: number;
  nro_inventario: string;
  clase: string;
  subtipo?: string;
  marca?: string;
  modelo?: string;
  nro_serie?: string;
  estado: 'Activo' | 'Inactivo' | 'En Mantenimiento' | 'Dado de Baja';
  puesto?: { id: number; numero: string; juzgado: { id: number; nombre: string } };
  fecha_alta?: string;
  observaciones?: string;
  activo: boolean;
}

export interface Software {
  id: number;
  nro_sw?: string;
  nombre: string;
  version?: string;
  tipo: string;
  proveedor?: string;
  tipo_licencia?: string;
  max_instalaciones?: number;
  instalaciones_actuales?: number;
  estado: string;
  fecha_vencimiento?: string;
  activo: boolean;
}

export interface Contrato {
  id: number;
  nro_contrato: string;
  proveedor?: { id: number; nombre: string };
  tipo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_venc: string;
  monto?: number;
  moneda?: string;
  estado: string;
  activo: boolean;
}

export interface Proveedor {
  id: number;
  nombre: string;
  cuit?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  activo: boolean;
  contratos?: Contrato[];
}

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje?: string;
  leida: boolean;
  referencia_tipo?: string;
  referencia_id?: number;
  fechaCreacion: string;
}

export interface Comentario {
  id: number;
  texto: string;
  interno: boolean;
  autor: User;
  fechaCreacion: string;
}

// ─── DTOs ──────────────────────────────────────────────────

export interface TicketFilters {
  page?: number;
  per_page?: number;
  q?: string;
  estado?: string;
  prioridad?: string;
  tipo?: string;
  asignado_a_id?: number;
  juzgado_id?: number;
  equipo_id?: number;
}

export interface CreateTicketDto {
  tipo: string;
  asunto: string;
  descripcion?: string;
  prioridad: string;
  juzgado_id: number;
  equipo_id?: number;
  software_id?: number;
}

export interface EquipoFilters {
  page?: number;
  per_page?: number;
  q?: string;
  clase?: string;
  estado?: string;
  juzgado_id?: number;
  sin_asignar?: boolean;
}

export interface CreateEquipoDto {
  nro_inventario: string;
  clase: string;
  subtipo?: string;
  marca?: string;
  modelo?: string;
  nro_serie?: string;
  estado?: string;
  puesto_id?: number;
  fecha_alta?: string;
  observaciones?: string;
}

export interface CreateSoftwareDto {
  nombre: string;
  version?: string;
  tipo: string;
  nro_sw?: string;
  proveedor?: string;
  tipo_licencia?: string;
  max_instalaciones?: number;
  fecha_vencimiento?: string;
  observaciones?: string;
}

export interface CreateContratoDto {
  nro_contrato: string;
  proveedor_id: number;
  tipo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_venc: string;
  monto?: number;
  moneda?: string;
}

export interface CreateProveedorDto {
  nombre: string;
  cuit?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
}

export interface CreateUsuarioDto {
  nombre: string;
  email: string;
  password: string;
  iniciales?: string;
  rol: string;
  avatarColor?: string;
  juzgadoIds?: number[];
}

