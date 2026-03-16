# SistemaPJ — Frontend

Frontend moderno para el sistema de **Mesa de Ayuda & Inventario IT** del Poder Judicial.

## Stack

| Librería                    | Uso                          |
| --------------------------- | ---------------------------- |
| **Next.js 14** (App Router) | Framework principal          |
| **TypeScript**              | Tipado estricto              |
| **Tailwind CSS**            | Estilos utilitarios          |
| **Zustand**                 | Estado global (auth, UI)     |
| **TanStack Query**          | Fetching/caché de datos      |
| **TanStack Table**          | Tablas con sorting y filtros |
| **React Hook Form + Zod**   | Formularios validados        |
| **Motion (Framer)**         | Animaciones                  |
| **Sonner**                  | Notificaciones toast         |
| **date-fns**                | Manejo de fechas             |
| **Axios**                   | Cliente HTTP                 |

---

## Instalación rápida

```bash
npm install
cp .env.example .env.local   # configurar URL del backend
npm run dev
```

Abrir http://localhost:3000

---

## Ejecutar con Docker (frontend + backend juntos)

Este frontend está preparado para levantarse en **Docker** junto con el backend usando `docker-compose`, de forma portable para cualquier entorno.

### 1. Estructura de carpetas esperada

Suponiendo un monorepo similar a:

```text
repo-root/
├── backend/
│   └── sistemap-backend/      # código + Dockerfile del backend
└── fronend/
    └── sistemapj/             # este frontend (Next.js) + docker-compose.yml
```

Si tu estructura es distinta, solo ajustá las rutas de `build:` y `env_file:` en el `docker-compose.yml`.

### 2. Variables de entorno del frontend

En `.env.local` (o vía `docker-compose`), la API del backend debe apuntar al **servicio** `backend` dentro de la red de Docker:

```env
NEXT_PUBLIC_API_URL=http://backend:8081/v1
```

### 3. `docker-compose.yml` (desde la carpeta del frontend)

En la raíz de este proyecto (`fronend/sistemapj`) se usa un `docker-compose.yml` similar a:

```yaml
services:
  backend:
    build: ../../backend/sistemap-backend # ruta relativa al backend
    container_name: sistemapj-backend
    ports:
      - '8081:8081'
    env_file:
      - ../../backend/sistemap-backend/.env

  frontend:
    build: . # este directorio (frontend)
    container_name: sistemapj-frontend
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8081/v1
    ports:
      - '3000:3000'
```

Si tu backend está en otra carpeta, solo cambiá `../../backend/sistemap-backend` y la ruta del `.env` por la ruta relativa correcta.

### 4. Levantar todo con un solo comando

Desde la carpeta del frontend (`fronend/sistemapj`):

```bash
docker-compose build
docker-compose up
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8081 (la API se consume desde el front con `http://backend:8080/v1` dentro de Docker)

---

## Cambiar el tema (IMPORTANTE)

**Todo el sistema de colores está en `src/lib/theme.ts`.**

Cambiá solo esta línea para rediseñar todo el sistema:

```ts
export const ACTIVE_PRESET: ThemePreset = 'default';
// Opciones: "default" | "emerald" | "slate" | "violet" | "custom"
```

| Preset  | Descripción                                      |
| ------- | ------------------------------------------------ |
| default | Azul institucional                               |
| emerald | Verde esmeralda                                  |
| slate   | Gris profesional                                 |
| violet  | Violeta premium                                  |
| custom  | Definí tus propios colores en el objeto `custom` |

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

