"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Ticket,
  AlertTriangle,
  CheckCircle2,
  Monitor,
  Package,
  FileText,
  Clock,
  TrendingUp,
  Zap,
} from "lucide-react";
import { dashboardApi, ticketsApi } from "@/lib/api";
import type { DashboardKPIs, Alerta, Ticket as TicketType } from "@/lib/api";
import { KPICard } from "@/components/ui/kpi-card";
import { EstadoBadge, PrioridadBadge } from "@/components/ui/badge";
import { formatRelative, cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

const ROLES_TECNICOS = ["tecnico_interno", "tecnico_proveedor"];

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [recentTickets, setRecentTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  const isTecnico = user?.rol && ROLES_TECNICOS.includes(user.rol);

  useEffect(() => {
    if (isTecnico) router.replace("/tickets");
  }, [isTecnico, router]);

  useEffect(() => {
    if (isTecnico) return;
    const load = async () => {
      const ticketParams = { per_page: 6, page: 1 } as { per_page: number; page: number; asignado_a_id?: number };
      if (isTecnico && user?.id) ticketParams.asignado_a_id = user.id;
      try {
        const [kpisRes, alertasRes, ticketsRes] = await Promise.allSettled([
          dashboardApi.kpis(),
          dashboardApi.alertas(),
          ticketsApi.list(ticketParams),
        ]);

        if (kpisRes.status === "fulfilled") setKpis(kpisRes.value.data.data);
        if (alertasRes.status === "fulfilled") setAlertas(alertasRes.value.data.data ?? []);
        if (ticketsRes.status === "fulfilled") setRecentTickets(ticketsRes.value.data.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isTecnico, user?.id]);

  if (isTecnico) return null;

  // Fallback mock data when backend not available
  const mockKpis: DashboardKPIs = {
    ticketsAbiertos: 24,
    ticketsEnProgreso: 8,
    ticketsCriticos: 3,
    ticketsResueltosSemana: 41,
    equiposActivos: 186,
    equiposMantenimiento: 4,
    softwarePorVencer: 2,
    contratosPorVencer: 1,
    slaCompliance: 94,
    tiempoPromedioResolucion: 6.2,
  };

  const data = kpis ?? mockKpis;

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
          variant={data.ticketsCriticos > 0 ? "danger" : "success"}
          index={1}
          subtitle="Requieren atención inmediata"
        />
        <KPICard
          title="Resueltos esta semana"
          value={data.ticketsResueltosSemana}
          icon={CheckCircle2}
          variant="success"
          index={2}
          trend={{ value: 12, label: "vs semana anterior" }}
        />
        <KPICard
          title="Cumplimiento SLA"
          value={`${data.slaCompliance}%`}
          icon={TrendingUp}
          variant={data.slaCompliance >= 90 ? "success" : data.slaCompliance >= 75 ? "warning" : "danger"}
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
          variant={data.softwarePorVencer > 0 ? "warning" : "success"}
          index={5}
          subtitle="Licencias próximas a vencer"
        />
        <KPICard
          title="Contratos por Vencer"
          value={data.contratosPorVencer}
          icon={FileText}
          variant={data.contratosPorVencer > 0 ? "warning" : "success"}
          index={6}
          subtitle="Próximos 30 días"
        />
        <KPICard
          title="Tiempo Promedio"
          value={`${data.tiempoPromedioResolucion}h`}
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
              <a href="/tickets" className="text-xs text-primary hover:underline">Ver todos →</a>
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
                // Mock tickets when backend not available
                MOCK_TICKETS.map((ticket) => (
                  <TicketRow key={ticket.id} ticket={ticket} />
                ))
              ) : (
                recentTickets.map((ticket) => (
                  <TicketRow key={ticket.id} ticket={ticket} />
                ))
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
            {alertas.length === 0 ? (
              MOCK_ALERTAS.map((a, i) => <AlertItem key={i} alerta={a} />)
            ) : (
              alertas.map((a) => <AlertItem key={a.id} alerta={a} />)
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
          {ticket.juzgado?.nombre ?? "Sin juzgado"} · {formatRelative(ticket.fechaCreacion)}
        </p>
      </div>
      <EstadoBadge estado={ticket.estado as never} />
    </a>
  );
}

function AlertItem({ alerta }: { alerta: Alerta }) {
  const severityStyles = {
    info: "border-info/30 bg-info-light",
    warning: "border-warning/30 bg-warning-light",
    danger: "border-danger/30 bg-danger-light",
  };
  const iconStyles = {
    info: "text-info",
    warning: "text-warning",
    danger: "text-danger",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border p-3",
        severityStyles[alerta.severidad] ?? severityStyles.info
      )}
    >
      <AlertTriangle
        className={cn("w-4 h-4 mt-0.5 flex-shrink-0", iconStyles[alerta.severidad] ?? iconStyles.info)}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{alerta.titulo}</p>
        {alerta.mensaje && (
          <p className="text-xs text-muted-foreground mt-0.5">{alerta.mensaje}</p>
        )}
      </div>
    </div>
  );
}

// ─── MOCK DATA (cuando no hay backend) ────────────────────

const MOCK_TICKETS: TicketType[] = [
  {
    id: 1, nroTicket: "#1041", tipo: "Hardware", asunto: "PC no enciende en Juzgado Civil 3",
    estado: "Abierto", prioridad: "Alta", creadoPorId: 1, juzgadoId: 1,
    fechaCreacion: new Date(Date.now() - 1000 * 60 * 45).toISOString(), updatedAt: new Date().toISOString(),
    juzgado: { id: 1, nombre: "Juzgado Civil 3" },
  },
  {
    id: 2, nroTicket: "#1040", tipo: "Software", asunto: "Error en Sistema de Gestión al guardar expediente",
    estado: "En Progreso", prioridad: "Critica", creadoPorId: 2, juzgadoId: 2,
    fechaCreacion: new Date(Date.now() - 1000 * 60 * 90).toISOString(), updatedAt: new Date().toISOString(),
    juzgado: { id: 2, nombre: "Cámara Penal" },
  },
  {
    id: 3, nroTicket: "#1039", tipo: "Red", asunto: "Sin conexión a internet en Civil 2, Puesto 3",
    estado: "Resuelto", prioridad: "Media", creadoPorId: 1, juzgadoId: 3,
    fechaCreacion: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), updatedAt: new Date().toISOString(),
    juzgado: { id: 3, nombre: "Juzgado Civil 2" },
  },
  {
    id: 4, nroTicket: "#1038", tipo: "Hardware", asunto: "Impresora HP offline Secretaría 1",
    estado: "Abierto", prioridad: "Baja", creadoPorId: 1, juzgadoId: 4,
    fechaCreacion: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), updatedAt: new Date().toISOString(),
    juzgado: { id: 4, nombre: "Secretaría 1" },
  },
];

const MOCK_ALERTAS: Alerta[] = [
  { id: 1, tipo: "contrato_por_vencer", titulo: "Contrato por vencer", mensaje: "Soporte SW vence en 12 días", severidad: "warning", fecha: new Date().toISOString() },
  { id: 2, tipo: "licencia_por_vencer", titulo: "Licencia antivirus", mensaje: "Kaspersky vence en 22 días (45 equipos)", severidad: "warning", fecha: new Date().toISOString() },
  { id: 3, tipo: "ticket_asignado", titulo: "3 tickets críticos abiertos", mensaje: "Sin técnico asignado", severidad: "danger", fecha: new Date().toISOString() },
];
