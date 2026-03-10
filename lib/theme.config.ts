/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║           SISTEMAPJ — CONFIGURACIÓN DE TEMA              ║
 * ║                                                          ║
 * ║  Para cambiar el estilo de todo el sistema,              ║
 * ║  solo modificá los valores en THEME_CONFIG y             ║
 * ║  seleccioná el preset que quieras en ACTIVE_THEME.       ║
 * ╚══════════════════════════════════════════════════════════╝
 */

// ─── TIPOGRAFÍA ───────────────────────────────────────────
// Cambiá estas URLs de Google Fonts para cambiar las fuentes del sistema.
export const FONT_CONFIG = {
  // Fuente principal para UI (premium, legible, profesional)
  sans: {
    name: 'Plus Jakarta Sans',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap',
    variable: '--font-sans',
    className: 'font-sans',
  },
  // Fuente monoespaciada para IDs, números de ticket, etc.
  mono: {
    name: 'JetBrains Mono',
    googleUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap',
    variable: '--font-mono',
    className: 'font-mono',
  },
} as const;

// ─── PRESETS DE COLORES ────────────────────────────────────
// Cada preset define todos los colores del sistema en HSL.
// Para crear uno nuevo, copiá uno existente y modificá los valores.
// Formato: "H S% L%" (sin la función hsl())

export const COLOR_PRESETS = {
  /**
   * AZUL JUDICIAL (Default)
   * Tonos fríos, profesional, institucional.
   */
  'azul-judicial': {
    label: 'Azul Judicial',
    light: {
      background: '216 20% 95%',
      foreground: '222 47% 11%',
      card: '0 0% 100%',
      'card-foreground': '222 47% 11%',
      popover: '0 0% 100%',
      'popover-foreground': '222 47% 11%',
      primary: '221 83% 53%',
      'primary-foreground': '0 0% 100%',
      secondary: '216 20% 92%',
      'secondary-foreground': '222 47% 25%',
      muted: '216 20% 92%',
      'muted-foreground': '215 16% 47%',
      accent: '221 83% 53%',
      'accent-foreground': '0 0% 100%',
      destructive: '0 84% 60%',
      'destructive-foreground': '0 0% 100%',
      border: '214 32% 91%',
      input: '214 32% 91%',
      ring: '221 83% 53%',
      radius: '0.625rem',
      // Sidebar
      sidebar: '222 47% 11%',
      'sidebar-foreground': '215 20% 65%',
      'sidebar-accent': '221 83% 53%',
      'sidebar-accent-foreground': '0 0% 100%',
      'sidebar-border': '222 32% 18%',
      'sidebar-ring': '221 83% 53%',
      // Status colors
      success: '142 71% 45%',
      'success-foreground': '0 0% 100%',
      'success-light': '143 85% 96%',
      warning: '38 92% 50%',
      'warning-foreground': '0 0% 100%',
      'warning-light': '48 96% 89%',
      danger: '0 84% 60%',
      'danger-foreground': '0 0% 100%',
      'danger-light': '0 93% 94%',
      info: '199 89% 48%',
      'info-foreground': '0 0% 100%',
      'info-light': '186 100% 94%',
    },
  },

  /**
   * VERDE ESMERALDA
   * Fresco, moderno, confiable.
   */
  esmeralda: {
    label: 'Esmeralda',
    light: {
      background: '150 20% 95%',
      foreground: '160 47% 8%',
      card: '0 0% 100%',
      'card-foreground': '160 47% 8%',
      popover: '0 0% 100%',
      'popover-foreground': '160 47% 8%',
      primary: '160 84% 39%',
      'primary-foreground': '0 0% 100%',
      secondary: '150 20% 92%',
      'secondary-foreground': '160 47% 20%',
      muted: '150 20% 92%',
      'muted-foreground': '155 16% 45%',
      accent: '160 84% 39%',
      'accent-foreground': '0 0% 100%',
      destructive: '0 84% 60%',
      'destructive-foreground': '0 0% 100%',
      border: '152 32% 89%',
      input: '152 32% 89%',
      ring: '160 84% 39%',
      radius: '0.5rem',
      sidebar: '160 47% 8%',
      'sidebar-foreground': '150 20% 65%',
      'sidebar-accent': '160 84% 39%',
      'sidebar-accent-foreground': '0 0% 100%',
      'sidebar-border': '160 32% 15%',
      'sidebar-ring': '160 84% 39%',
      success: '142 71% 45%',
      'success-foreground': '0 0% 100%',
      'success-light': '143 85% 96%',
      warning: '38 92% 50%',
      'warning-foreground': '0 0% 100%',
      'warning-light': '48 96% 89%',
      danger: '0 84% 60%',
      'danger-foreground': '0 0% 100%',
      'danger-light': '0 93% 94%',
      info: '199 89% 48%',
      'info-foreground': '0 0% 100%',
      'info-light': '186 100% 94%',
    },
  },

  /**
   * PIZARRA OSCURA (Dark Mode ready)
   * Elegante, minimalista, moderno.
   */
  pizarra: {
    label: 'Pizarra',
    light: {
      background: '220 14% 96%',
      foreground: '220 26% 14%',
      card: '0 0% 100%',
      'card-foreground': '220 26% 14%',
      popover: '0 0% 100%',
      'popover-foreground': '220 26% 14%',
      primary: '220 26% 14%',
      'primary-foreground': '0 0% 100%',
      secondary: '220 14% 92%',
      'secondary-foreground': '220 26% 30%',
      muted: '220 14% 92%',
      'muted-foreground': '220 9% 46%',
      accent: '262 83% 58%',
      'accent-foreground': '0 0% 100%',
      destructive: '0 84% 60%',
      'destructive-foreground': '0 0% 100%',
      border: '220 13% 91%',
      input: '220 13% 91%',
      ring: '262 83% 58%',
      radius: '0.75rem',
      sidebar: '220 26% 14%',
      'sidebar-foreground': '220 14% 65%',
      'sidebar-accent': '262 83% 58%',
      'sidebar-accent-foreground': '0 0% 100%',
      'sidebar-border': '220 20% 20%',
      'sidebar-ring': '262 83% 58%',
      success: '142 71% 45%',
      'success-foreground': '0 0% 100%',
      'success-light': '143 85% 96%',
      warning: '38 92% 50%',
      'warning-foreground': '0 0% 100%',
      'warning-light': '48 96% 89%',
      danger: '0 84% 60%',
      'danger-foreground': '0 0% 100%',
      'danger-light': '0 93% 94%',
      info: '199 89% 48%',
      'info-foreground': '0 0% 100%',
      'info-light': '186 100% 94%',
    },
  },

  /**
   * TIERRA (Warm tones)
   * Cálido, accesible, amigable.
   */
  tierra: {
    label: 'Tierra',
    light: {
      background: '30 20% 95%',
      foreground: '20 47% 11%',
      card: '0 0% 100%',
      'card-foreground': '20 47% 11%',
      popover: '0 0% 100%',
      'popover-foreground': '20 47% 11%',
      primary: '24 95% 53%',
      'primary-foreground': '0 0% 100%',
      secondary: '30 20% 92%',
      'secondary-foreground': '20 47% 25%',
      muted: '30 20% 92%',
      'muted-foreground': '25 16% 47%',
      accent: '24 95% 53%',
      'accent-foreground': '0 0% 100%',
      destructive: '0 84% 60%',
      'destructive-foreground': '0 0% 100%',
      border: '28 32% 89%',
      input: '28 32% 89%',
      ring: '24 95% 53%',
      radius: '0.5rem',
      sidebar: '20 47% 11%',
      'sidebar-foreground': '28 20% 65%',
      'sidebar-accent': '24 95% 53%',
      'sidebar-accent-foreground': '0 0% 100%',
      'sidebar-border': '20 32% 18%',
      'sidebar-ring': '24 95% 53%',
      success: '142 71% 45%',
      'success-foreground': '0 0% 100%',
      'success-light': '143 85% 96%',
      warning: '38 92% 50%',
      'warning-foreground': '0 0% 100%',
      'warning-light': '48 96% 89%',
      danger: '0 84% 60%',
      'danger-foreground': '0 0% 100%',
      'danger-light': '0 93% 94%',
      info: '199 89% 48%',
      'info-foreground': '0 0% 100%',
      'info-light': '186 100% 94%',
    },
  },
} as const;

// ─── TEMA ACTIVO ─────────────────────────────────────────────
// ¡CAMBIÁ ESTA LÍNEA para cambiar el tema de todo el sistema!
// Opciones: "azul-judicial" | "esmeralda" | "pizarra" | "tierra"
export const ACTIVE_THEME = 'azul-judicial' as keyof typeof COLOR_PRESETS;

// ─── OPCIONES ADICIONALES ─────────────────────────────────
export const THEME_OPTIONS = {
  // Si true, el sidebar empieza colapsado en pantallas medianas
  sidebarCollapsedByDefault: false,
  // Si true, muestra animaciones de entrada en las páginas
  enablePageAnimations: true,
  // Si true, muestra gradientes en los KPI cards
  enableGradientCards: true,
  // Número de items por página por defecto en las tablas
  defaultPageSize: 20,
} as const;

// ─── HELPER: genera CSS variables desde el preset activo ──
export function generateCSSVars(): string {
  const preset = COLOR_PRESETS[ACTIVE_THEME];
  const vars = preset.light;
  return Object.entries(vars)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join('\n');
}

