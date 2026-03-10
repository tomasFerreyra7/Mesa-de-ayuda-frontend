# SistemaPJ — Frontend

Frontend moderno para el sistema de **Mesa de Ayuda & Inventario IT** del Poder Judicial.

## Stack

| Librería | Uso |
|---|---|
| **Next.js 14** (App Router) | Framework principal |
| **TypeScript** | Tipado estricto |
| **Tailwind CSS** | Estilos utilitarios |
| **Zustand** | Estado global (auth, UI) |
| **TanStack Query** | Fetching/caché de datos |
| **TanStack Table** | Tablas con sorting y filtros |
| **React Hook Form + Zod** | Formularios validados |
| **Motion (Framer)** | Animaciones |
| **Sonner** | Notificaciones toast |
| **date-fns** | Manejo de fechas |
| **Axios** | Cliente HTTP |

---

## Instalación rápida

```bash
npm install
cp .env.example .env.local   # configurar URL del backend
npm run dev
```

Abrir http://localhost:3000

---

## Cambiar el tema (IMPORTANTE)

**Todo el sistema de colores está en `src/lib/theme.ts`.**

Cambiá solo esta línea para rediseñar todo el sistema:

```ts
export const ACTIVE_PRESET: ThemePreset = "default";
// Opciones: "default" | "emerald" | "slate" | "violet" | "custom"
```

| Preset | Descripción |
|---|---|
| default | Azul institucional |
| emerald | Verde esmeralda |
| slate | Gris profesional |
| violet | Violeta premium |
| custom | Definí tus propios colores en el objeto `custom` |

Cambiando las ~18 variables del objeto `ThemeColors` cambia absolutamente TODO: sidebar, botones, badges, formularios, tablas, KPIs.

---

## Estructura

```
src/
├── app/               # Páginas (login, dashboard, tickets, equipos, software, contratos, proveedores, ubicaciones, usuarios, notificaciones)
├── components/
│   ├── layout/        # AppLayout, Sidebar, Topbar, Providers
│   ├── ui/            # Badge, DataTable, Modal, Form, Pagination
│   ├── dashboard/     # KPICard
│   └── tickets/       # TicketDetailPanel (slide-in con tabs)
├── lib/
│   ├── api.ts         # Axios + interceptores JWT
│   ├── theme.ts       # ← CONFIGURACIÓN DE COLORES (editar aquí)
│   ├── utils.ts       # Helpers: fechas, colores, SLA, avatares
│   └── services/      # Servicios por entidad
├── store/
│   ├── auth.ts        # Zustand: usuario y sesión
│   └── ui.ts          # Zustand: estado del sidebar
└── types/index.ts     # Tipos TypeScript de todas las entidades
```
