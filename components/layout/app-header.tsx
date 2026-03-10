"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { useEffect, useState } from "react";
import { notificacionesApi } from "@/lib/api";
import type { Notificacion } from "@/lib/api";
import { formatRelative, cn } from "@/lib/utils";
import { toast } from "sonner";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tickets": "Tickets",
  "/equipos": "Equipos — Inventario Hardware",
  "/software": "Software — Inventario",
  "/contratos": "Contratos",
  "/proveedores": "Proveedores",
  "/usuarios": "Usuarios",
  "/ubicaciones": "Ubicaciones",
  "/perfil": "Mi Perfil",
};

export function AppHeader() {
  const pathname = usePathname();
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [unread, setUnread] = useState(0);

  const title =
    Object.entries(PAGE_TITLES).find(([path]) => pathname.startsWith(path))?.[1] ?? "SistemaPJ";

  useEffect(() => {
    notificacionesApi
      .list({ leida: false })
      .then((res) => {
        const items: Notificacion[] = res.data.data ?? [];
        setNotifs(items.slice(0, 8));
        setUnread(items.length);
      })
      .catch(() => {
        // Sin notificaciones en entornos sin backend
      });
  }, []);

  const markRead = async (id: number) => {
    try {
      await notificacionesApi.markRead(id);
      setNotifs((prev) => prev.filter((n) => n.id !== id));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error("Error al marcar notificación");
    }
  };

  return (
    <header className="h-[60px] border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Notificaciones */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-danger-foreground text-[9px] font-bold flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              className="w-80 bg-card border border-border rounded-xl shadow-xl p-0 z-[100] data-[state=open]:animate-fade-in"
            >
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Notificaciones</p>
                {unread > 0 && (
                  <span className="text-xs text-muted-foreground">{unread} sin leer</span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Sin notificaciones</p>
                  </div>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "px-4 py-3 border-b border-border/50 last:border-0",
                        "flex items-start gap-3 hover:bg-secondary/50 cursor-pointer transition-colors",
                        !n.leida && "bg-primary/5"
                      )}
                      onClick={() => markRead(n.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{n.titulo}</p>
                        {n.mensaje && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensaje}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatRelative(n.fechaCreacion)}
                        </p>
                      </div>
                      {!n.leida && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </header>
  );
}
