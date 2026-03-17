'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Ticket, AlertTriangle, CheckCircle2, Monitor, Package, FileText, Clock, TrendingUp, Zap } from 'lucide-react';
import { dashboardApi, ticketsApi, equiposApi, softwareApi, contratosApi } from '@/lib/api';
import type { DashboardKPIs, Alerta, Ticket as TicketType, Equipo, Software, Contrato } from '@/lib/api';
import { KPICard } from '@/components/ui/kpi-card';
import { EstadoBadge, PrioridadBadge } from '@/components/ui/badge';
import { formatRelative, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const ROLES_TECNICOS = ['tecnico_interno', 'tecnico_proveedor'];

const PER_PAGE = 500;

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isWithinNextDays(date: Date | null, days: number): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  return date >= today && date <= end;
}

function isWithinLastDays(date: Date | null, days: number): boolean {
  if (!date) return false;
  const since = new Date();
  since.setDate(since.getDate() - days);
  return date >= since;
}

function computeKpisFromData(tickets: TicketType[], equipos: Equipo[], software: Software[], contratos: Contrato[]): DashboardKPIs {
  const abiertos = tickets.filter((t) => t.estado === 'Abierto').length;
  const enProgreso = tickets.filter((t) => t.estado === 'En Progreso').length;
  const criticos = tickets.filter((t) => t.prioridad === 'Critica' && t.estado !== 'Resuelto' && t.estado !== 'Cerrado').length;

  const resueltosSemana = tickets.filter((t) => {
    if (t.estado !== 'Resuelto' && t.estado !== 'Cerrado') return false;
    const fecha = parseDate((t as { fechaResol?: string })?.fechaResol) ?? parseDate((t as { fechaCierre?: string })?.fechaCierre) ?? parseDate(t.updatedAt);
    return isWithinLastDays(fecha, 7);
  }).length;

  const activos = equipos.filter((e) => e.estado === 'Activo').length;
  const mantenimiento = equipos.filter((e) => e.estado === 'En Mantenimiento').length;

  const swVenc = software.filter((s) => {
    const f = s.fecha_vencimiento ?? (s as { fechaVencimiento?: string }).fechaVencimiento;
    const d = parseDate(f);
    return isWithinNextDays(d, 30);
  }).length;

  const contVenc = contratos.filter((c) => {
    const f = c.fecha_venc ?? (c as { fechaVenc?: string }).fechaVenc;
    const d = parseDate(f);
    return isWithinNextDays(d, 30);
  }).length;

  // SLA: uso `slaCumplido` si lo trae el backend; si no, lo calculo
  // a partir de prioridad y diferencia entre `fechaCreacion` y `fechaResol/fechaCierre`
  const TICKET_SLA_HOURS: Record<TicketType['prioridad'], number> = {
    Critica: 4,
    Alta: 8,
    Media: 24,
    Baja: 72,
  };

  let totalCerradosParaSla = 0;
  let slaCumplidos = 0;
  let sumHorasResolucion = 0;
  let countResolucion = 0;

  for (const t of tickets) {
    const fechaCreacion = parseDate(t.fechaCreacion);
    const fechaFin = parseDate((t as { fechaResol?: string })?.fechaResol) ?? parseDate((t as { fechaCierre?: string })?.fechaCierre);

    const esCerrado = t.estado === 'Resuelto' || t.estado === 'Cerrado';
    if (esCerrado && fechaCreacion && fechaFin) {
      const diffMs = fechaFin.getTime() - fechaCreacion.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);
      sumHorasResolucion += diffHoras;
      countResolucion += 1;

      totalCerradosParaSla += 1;
      const slaBackend = (t as { slaCumplido?: boolean }).slaCumplido;
      if (typeof slaBackend === 'boolean') {
        if (slaBackend) slaCumplidos += 1;
      } else {
        const objetivoHoras = TICKET_SLA_HOURS[t.prioridad] ?? 24;
        if (diffHoras <= objetivoHoras) slaCumplidos += 1;
      }
    }
  }

  const slaCompliance = totalCerradosParaSla > 0 ? Math.round((slaCumplidos / totalCerradosParaSla) * 100) : 0;
  const tiempoPromedioResolucion = countResolucion > 0 ? Number((sumHorasResolucion / countResolucion).toFixed(1)) : 0;

  return {
    ticketsAbiertos: abiertos,
    ticketsEnProgreso: enProgreso,
    ticketsCriticos: criticos,
    ticketsResueltosSemana: resueltosSemana,
    equiposActivos: activos,
    equiposMantenimiento: mantenimiento,
    softwarePorVencer: swVenc,
    contratosPorVencer: contVenc,
    slaCompliance,
    tiempoPromedioResolucion,
  };
}

function buildAlertasFromData(tickets: TicketType[], software: Software[], contratos: Contrato[]): Alerta[] {
  const out: Alerta[] = [];
  const criticos = tickets.filter((t) => t.prioridad === 'Critica' && t.estado !== 'Resuelto' && t.estado !== 'Cerrado');
  if (criticos.length > 0) {
    out.push({
      id: -1,
      tipo: 'ticket_critico',
      titulo: `${criticos.length} ticket(s) crítico(s) abierto(s)`,
      mensaje: 'Requieren atención inmediata',
      severidad: 'danger',
      fecha: new Date().toISOString(),
    });
  }
  const swVenc = software.filter((s) => {
    const f = s.fecha_vencimiento ?? (s as { fechaVencimiento?: string }).fechaVencimiento;
    return isWithinNextDays(parseDate(f), 30);
  });
  if (swVenc.length > 0) {
    out.push({
      id: -2,
      tipo: 'licencia_por_vencer',
      titulo: 'Licencias por vencer',
      mensaje: `${swVenc.length} licencia(s) en los próximos 30 días`,
      severidad: 'warning',
      fecha: new Date().toISOString(),
    });
  }
  const contVenc = contratos.filter((c) => {
    const f = c.fecha_venc ?? (c as { fechaVenc?: string }).fechaVenc;
    return isWithinNextDays(parseDate(f), 30);
  });
  if (contVenc.length > 0) {
    out.push({
      id: -3,
      tipo: 'contrato_por_vencer',
      titulo: 'Contratos por vencer',
      mensaje: `${contVenc.length} contrato(s) en los próximos 30 días`,
      severidad: 'warning',
      fecha: new Date().toISOString(),
    });
  }
  return out;
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [computedKpis, setComputedKpis] = useState<DashboardKPIs | null>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [computedAlertas, setComputedAlertas] = useState<Alerta[]>([]);
  const [recentTickets, setRecentTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  const isTecnico = user?.rol && ROLES_TECNICOS.includes(user.rol);

  useEffect(() => {
    if (isTecnico) router.replace('/tickets');
  }, [isTecnico, router]);

  useEffect(() => {
    if (isTecnico) return;
    const load = async () => {
      const ticketParams = {
        per_page: 6,
        page: 1,
      } as { per_page: number; page: number; asignado_a_id?: number };
      if (user?.id && isTecnico) ticketParams.asignado_a_id = user.id;
      try {
        const [kpisRes, alertasRes, ticketsRes] = await Promise.allSettled([dashboardApi.kpis(), dashboardApi.alertas(), ticketsApi.list(ticketParams)]);

        if (kpisRes.status === 'fulfilled' && kpisRes.value.data?.data != null) {
          setKpis(kpisRes.value.data.data);
        }
        if (alertasRes.status === 'fulfilled') {
          setAlertas(alertasRes.value.data?.data ?? []);
        }
        if (ticketsRes.status === 'fulfilled') {
          setRecentTickets(ticketsRes.value.data?.data ?? []);
        }

        if (kpisRes.status !== 'fulfilled' || kpisRes.value?.data?.data == null) {
          const [tAll, eRes, sRes, cRes] = await Promise.allSettled([
            ticketsApi.list({ per_page: PER_PAGE, page: 1 }),
            equiposApi.list({ per_page: PER_PAGE, page: 1 }),
            softwareApi.list({ per_page: PER_PAGE }),
            contratosApi.list({ per_page: PER_PAGE }),
          ]);
          const tickets: TicketType[] = tAll.status === 'fulfilled' ? (tAll.value.data?.data ?? []) : [];
          const equipos: Equipo[] = eRes.status === 'fulfilled' ? (eRes.value.data?.data ?? []) : [];
          const software: Software[] = sRes.status === 'fulfilled' ? (sRes.value.data?.data ?? []) : [];
          const contratos: Contrato[] = cRes.status === 'fulfilled' ? (cRes.value.data?.data ?? []) : [];
          setComputedKpis(computeKpisFromData(tickets, equipos, software, contratos));
          setComputedAlertas(buildAlertasFromData(tickets, software, contratos));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isTecnico, user?.id]);

  if (isTecnico) return null;

  const data: DashboardKPIs = kpis ??
    computedKpis ?? {
      ticketsAbiertos: 0,
      ticketsEnProgreso: 0,
      ticketsCriticos: 0,
      ticketsResueltosSemana: 0,
      equiposActivos: 0,
      equiposMantenimiento: 0,
      softwarePorVencer: 0,
      contratosPorVencer: 0,
      slaCompliance: 0,
      tiempoPromedioResolucion: 0,
    };
  const alertasToShow = alertas.length > 0 ? alertas : computedAlertas;
  const showTrend = kpis != null;

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Tickets Abiertos"
          value={data.ticketsAbiertos}
          icon={Ticket}
          variant="info"
          index={0}
          subtitle={`${data.ticketsEnProgreso} en progreso`}
        />
        <KPICard
          title="Tickets Críticos"
          value={data.ticketsCriticos}
          icon={Zap}
          variant={data.ticketsCriticos > 0 ? 'danger' : 'success'}
          index={1}
          subtitle="Requieren atención inmediata"
        />
        <KPICard
          title="Resueltos esta semana"
          value={data.ticketsResueltosSemana}
          icon={CheckCircle2}
          variant="success"
          index={2}
          {...(showTrend && { trend: { value: 12, label: 'vs semana anterior' } })}
        />
        <KPICard
          title="Cumplimiento SLA"
          value={data.slaCompliance > 0 ? `${data.slaCompliance}%` : '—'}
          icon={TrendingUp}
          variant={data.slaCompliance >= 90 ? 'success' : data.slaCompliance >= 75 ? 'warning' : 'danger'}
          index={3}
          subtitle="Últimos 30 días"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Equipos Activos"
          value={data.equiposActivos}
          icon={Monitor}
          variant="default"
          index={4}
          subtitle={`${data.equiposMantenimiento} en mantenimiento`}
        />
        <KPICard
          title="Software por Vencer"
          value={data.softwarePorVencer}
          icon={Package}
          variant={data.softwarePorVencer > 0 ? 'warning' : 'success'}
          index={5}
          subtitle="Licencias próximas a vencer"
        />
        <KPICard
          title="Contratos por Vencer"
          value={data.contratosPorVencer}
          icon={FileText}
          variant={data.contratosPorVencer > 0 ? 'warning' : 'success'}
          index={6}
          subtitle="Próximos 30 días"
        />
        <KPICard
          title="Tiempo Promedio"
          value={data.tiempoPromedioResolucion > 0 ? `${data.tiempoPromedioResolucion}h` : '—'}
          icon={Clock}
          variant="default"
          index={7}
          subtitle="Resolución de tickets"
        />
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent tickets */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Tickets Recientes</h2>
              <a href="/tickets" className="text-xs text-primary hover:underline">
                Ver todos →
              </a>
            </div>
            <div className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-3.5 space-y-2">
                    <div className="h-3.5 bg-secondary rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-secondary rounded animate-pulse w-1/2" />
                  </div>
                ))
              ) : recentTickets.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">No hay tickets recientes</div>
              ) : (
                recentTickets.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)
              )}
            </div>
          </motion.div>
        </div>

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card border border-border rounded-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Alertas Activas</h2>
          </div>
          <div className="p-4 space-y-3">
            {alertasToShow.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No hay alertas activas</div>
            ) : (
              alertasToShow.map((a) => <AlertItem key={a.id} alerta={a} />)
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: TicketType }) {
  return (
    <a href={`/tickets/${ticket.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="ticket-id">{ticket.nroTicket}</span>
          <PrioridadBadge prioridad={ticket.prioridad as never} />
        </div>
        <p className="text-sm text-foreground truncate">{ticket.asunto}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {ticket.juzgado?.nombre ?? 'Sin juzgado'} · {formatRelative(ticket.fechaCreacion)}
        </p>
      </div>
      <EstadoBadge estado={ticket.estado as never} />
    </a>
  );
}

function AlertItem({ alerta }: { alerta: Alerta }) {
  const severityStyles = {
    info: 'border-info/30 bg-info-light',
    warning: 'border-warning/30 bg-warning-light',
    danger: 'border-danger/30 bg-danger-light',
  };
  const iconStyles = {
    info: 'text-info',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  return (
    <div className={cn('flex items-start gap-2.5 rounded-lg border p-3', severityStyles[alerta.severidad] ?? severityStyles.info)}>
      <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', iconStyles[alerta.severidad] ?? iconStyles.info)} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{alerta.titulo}</p>
        {alerta.mensaje && <p className="text-xs text-muted-foreground mt-0.5">{alerta.mensaje}</p>}
      </div>
    </div>
  );
}

