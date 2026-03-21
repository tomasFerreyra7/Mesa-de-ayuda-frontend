'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Eye, EyeOff, Scale, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { normalizeUserFromApi } from '@/lib/normalize-user';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get('blocked') === '1') {
      toast.error('No podés acceder al sistema sin iniciar sesión');
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await authApi.login(data.email, data.password);
      // Backend puede devolver { data: { token, usuario } } o { user, role } etc.
      const payload = (res.data?.data ?? res.data) as Record<string, unknown> | undefined;
      const token = (payload?.token ?? payload?.access_token) as string | undefined;
      const rawUser = (payload?.usuario ?? payload?.user) as Record<string, unknown> | undefined;
      if (!token || !rawUser) {
        console.error('Login: respuesta sin token o usuario', res.data);
        toast.error('El backend no devolvió token o usuario. Revisá la consola.');
        return;
      }
      const usuario = normalizeUserFromApi(rawUser);
      setAuth(usuario, token);
      toast.success(`Bienvenido, ${usuario.nombre}`);
      const isTecnico = ['tecnico_interno', 'tecnico_proveedor'].includes(usuario.rol);
      setTimeout(() => router.push(isTecnico ? '/tickets' : '/dashboard'), 0);
    } catch (err: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Login error:', err);
      }
      const error = err as { code?: string; message?: string; response?: { data?: { message?: string }; status?: number } };
      const isNetworkError = error.code === 'ERR_NETWORK' || error.message === 'Network Error';
      const apiUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/v1') : 'backend';
      const msg = isNetworkError
        ? `No se pudo conectar al servidor (${apiUrl}). Verificá que el backend esté corriendo en ese puerto y que .env.local tenga la URL correcta.`
        : (error.response?.data?.message ??
          (error.response?.status === 401 ? 'Email o contraseña incorrectos' : null) ??
          error.message ??
          'Credenciales inválidas');
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center mb-8 gap-3"
        >
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <Scale className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">SistemaPJ</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Mesa de Ayuda & Inventario IT</p>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-6 shadow-sm"
        >
          <h2 className="text-base font-medium text-foreground mb-5">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Email <span className="text-destructive">*</span>
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="usuario@pj.gob.ar"
                autoComplete="email"
                className={cn(
                  'w-full h-9 px-3 rounded-md border bg-background text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                  errors.email ? 'border-danger' : 'border-input',
                )}
              />
              {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Contraseña <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn(
                    'w-full h-9 px-3 pr-10 rounded-md border bg-background text-sm placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                    errors.password ? 'border-danger' : 'border-input',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium',
                'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2 mt-2',
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando…
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6">Poder Judicial — Sistema Interno</p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

