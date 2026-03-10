import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/api';

// La duración de la sesión la define el backend (TTL del JWT). Para que dure más,
// configurá en el backend un expiry mayor (ej. 7 días) o usá refresh tokens.

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /** Solo en false hasta que persist rehidrata desde localStorage; evita redirigir a login al refrescar */
  _hasHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setHasHydrated: () => void;
}

const STORAGE_KEY = 'sistemapj-auth';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (user, token) => {
        localStorage.setItem('access_token', token);
        // Marcar como hidratado para que el layout del dashboard no quede en blanco al entrar desde login
        set({ user, token, isAuthenticated: true, _hasHydrated: true });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setHasHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch {
            // quota exceeded, etc.
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            // ignore
          }
        },
      },
      partialize: (state) =>
        ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }) as AuthState,
      // Siempre marcar como hidratado cuando termina el intento (éxito o error), para no quedar en "Cargando..." infinito
      onRehydrateStorage: () => () => {
        useAuthStore.getState().setHasHydrated();
      },
    },
  ),
);

