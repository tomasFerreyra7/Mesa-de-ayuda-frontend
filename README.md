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

Cualquier persona que clone el repo puede levantar todo con Docker si tiene el archivo `.env` del backend (se comparte por privado, no está en el repo).

### Requisitos

- **Docker** y **Docker Compose** instalados.
- Archivo **`.env`** en la raíz de este proyecto (`sistemapj`), con las variables del backend (base de datos, JWT, CORS, etc.). Quien mantenga el repo te lo pasa por privado; no está en Git por seguridad.

### Pasos para quien clone el repo

1. **Clonar el repositorio** (solo el frontend, o el monorepo si aplica).

2. **Entrar a la carpeta del frontend** (donde está este README y el `docker-compose.yml`):

   ```bash
   cd sistemapj
   ```

3. **Crear el archivo `.env`** en esa misma carpeta con el contenido que te hayan pasado por privado. Debe tener al menos: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `NODE_ENV`, `CORS_ORIGINS` (incluyendo `http://localhost:3000`).

4. **Estructura para construir el backend:** el `docker-compose` construye el backend desde la ruta `../../backend/sistemap-backend` (relativa a esta carpeta). Es decir, la estructura esperada es:

   ```text
   Curso de verano/   (o tu carpeta raíz)
   ├── backend/
   │   └── sistemap-backend/   ← Dockerfile + código del backend
   └── fronend/
       └── sistemapj/         ← este repo + .env + docker-compose.yml
   ```

   Si el backend está en otra ruta, editá en `docker-compose.yml` la línea `context: ../../backend/sistemap-backend` y poné la ruta correcta.

5. **Levantar todo con un solo comando:**

   ```bash
   npm run up
   ```

   (o `docker-compose up --build`). Se construyen backend y frontend y se inician ambos.

6. **Abrir en el navegador:**
   - **Frontend:** http://localhost:3000
   - **Backend (API):** http://localhost:8080/v1

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

