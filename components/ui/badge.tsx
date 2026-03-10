import { cn } from "@/lib/utils";

export type TicketEstado = "Abierto" | "En Progreso" | "Resuelto" | "Cerrado";
export type TicketPrioridad = "Critica" | "Alta" | "Media" | "Baja";
export type EquipoEstado = "Activo" | "Inactivo" | "En Mantenimiento" | "Dado de Baja";

const estadoStyles: Record<TicketEstado, string> = {
  Abierto: "bg-info-light text-info border-info/20",
  "En Progreso": "bg-warning-light text-warning border-warning/20",
  Resuelto: "bg-success-light text-success border-success/20",
  Cerrado: "bg-secondary text-muted-foreground border-border",
};

const estadoDot: Record<TicketEstado, string> = {
  Abierto: "bg-info",
  "En Progreso": "bg-warning",
  Resuelto: "bg-success",
  Cerrado: "bg-muted-foreground",
};

const prioridadStyles: Record<TicketPrioridad, string> = {
  Critica: "bg-danger-light text-danger border-danger/20",
  Alta: "bg-orange-50 text-orange-600 border-orange-200",
  Media: "bg-warning-light text-warning border-warning/20",
  Baja: "bg-secondary text-muted-foreground border-border",
};

const equipoEstadoStyles: Record<EquipoEstado, string> = {
  Activo: "bg-success-light text-success border-success/20",
  Inactivo: "bg-secondary text-muted-foreground border-border",
  "En Mantenimiento": "bg-warning-light text-warning border-warning/20",
  "Dado de Baja": "bg-danger-light text-danger border-danger/20",
};

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "secondary" | "outline";
}

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border",
        variant === "outline" && "bg-transparent border-border text-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

interface EstadoBadgeProps {
  estado: TicketEstado;
  className?: string;
}

export function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border",
        estadoStyles[estado] ?? "bg-secondary text-muted-foreground border-border",
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", estadoDot[estado] ?? "bg-muted-foreground")} />
      {estado}
    </span>
  );
}

interface PrioridadBadgeProps {
  prioridad: TicketPrioridad;
  className?: string;
}

export function PrioridadBadge({ prioridad, className }: PrioridadBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        prioridadStyles[prioridad] ?? "bg-secondary text-muted-foreground border-border",
        className
      )}
    >
      {prioridad === "Critica" && "🔴 "}
      {prioridad}
    </span>
  );
}

interface EquipoEstadoBadgeProps {
  estado: EquipoEstado;
  className?: string;
}

export function EquipoEstadoBadge({ estado, className }: EquipoEstadoBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        equipoEstadoStyles[estado] ?? "bg-secondary text-muted-foreground border-border",
        className
      )}
    >
      {estado}
    </span>
  );
}
