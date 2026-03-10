"use client";

import { useEffect, useState } from "react";
import { ChevronRight, MapPin, Building2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { ubicacionesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Circunscripcion {
  id: number;
  codigo: string;
  nombre: string;
  distritos?: Distrito[];
}

interface Distrito {
  id: number;
  codigo: string;
  nombre: string;
  edificio?: string;
  direccion?: string;
  juzgados?: Juzgado[];
}

interface Juzgado {
  id: number;
  codigo: string;
  nombre: string;
  tipo?: string;
}

export default function UbicacionesPage() {
  const [tree, setTree] = useState<Circunscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCirc, setExpandedCirc] = useState<Set<number>>(new Set());
  const [expandedDist, setExpandedDist] = useState<Set<number>>(new Set());

  useEffect(() => {
    ubicacionesApi.circunscripciones()
      .then((res) => setTree(res.data.data ?? []))
      .catch(() => setTree(MOCK_TREE))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Jerarquía: Circunscripción → Distrito → Juzgado → Puesto</p>
        <Button size="sm"><Plus className="w-4 h-4" /> Nueva Ubicación</Button>
      </div>

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
              <button
                onClick={() => toggleCirc(circ.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
              >
                <ChevronRight
                  className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedCirc.has(circ.id) && "rotate-90")}
                />
                <MapPin className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-foreground">{circ.nombre}</span>
                  <span className="text-xs text-muted-foreground ml-2">({circ.codigo})</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {circ.distritos?.length ?? 0} distrito{circ.distritos?.length !== 1 ? "s" : ""}
                </span>
              </button>

              {/* Distritos */}
              {expandedCirc.has(circ.id) && (
                <div className="border-t border-border bg-secondary/20">
                  {circ.distritos?.map((dist) => (
                    <div key={dist.id}>
                      <button
                        onClick={() => toggleDist(dist.id)}
                        className="w-full flex items-center gap-3 px-6 py-3 hover:bg-secondary/50 transition-colors text-left"
                      >
                        <ChevronRight
                          className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", expandedDist.has(dist.id) && "rotate-90")}
                        />
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">{dist.nombre}</span>
                          {dist.direccion && (
                            <span className="text-xs text-muted-foreground ml-2">{dist.direccion}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {dist.juzgados?.length ?? 0} juzgado{dist.juzgados?.length !== 1 ? "s" : ""}
                        </span>
                      </button>

                      {/* Juzgados */}
                      {expandedDist.has(dist.id) && dist.juzgados && (
                        <div className="bg-card border-t border-border/50">
                          {dist.juzgados.map((j) => (
                            <div
                              key={j.id}
                              className="flex items-center gap-3 px-10 py-2.5 border-b border-border/30 last:border-0 hover:bg-secondary/30 cursor-pointer"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                              <span className="text-sm text-foreground flex-1">{j.nombre}</span>
                              {j.tipo && <span className="text-xs text-muted-foreground">{j.tipo}</span>}
                              <span className="font-mono text-xs text-muted-foreground/60">{j.codigo}</span>
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
    id: 1, codigo: "C1", nombre: "1ra Circunscripción",
    distritos: [
      {
        id: 1, codigo: "D1", nombre: "Capital", edificio: "Palacio de Justicia", direccion: "Amenábar 2551",
        juzgados: [
          { id: 1, codigo: "JC01", nombre: "Juzgado Civil y Comercial N°1", tipo: "Juzgado" },
          { id: 2, codigo: "JC02", nombre: "Juzgado Civil y Comercial N°2", tipo: "Juzgado" },
          { id: 3, codigo: "CAM1", nombre: "Cámara de Apelaciones Civil", tipo: "Camara" },
        ],
      },
      {
        id: 2, codigo: "D2", nombre: "Rosario", edificio: "Centro de Justicia Rosario",
        juzgados: [
          { id: 4, codigo: "JCR1", nombre: "Juzgado Civil Rosario N°1", tipo: "Juzgado" },
        ],
      },
    ],
  },
  {
    id: 2, codigo: "C2", nombre: "2da Circunscripción",
    distritos: [
      {
        id: 3, codigo: "D3", nombre: "Venado Tuerto",
        juzgados: [
          { id: 5, codigo: "JCVT", nombre: "Juzgado Civil Venado Tuerto", tipo: "Juzgado" },
        ],
      },
    ],
  },
];
