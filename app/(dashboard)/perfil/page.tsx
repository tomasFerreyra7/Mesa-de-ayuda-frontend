"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { KeyRound, User } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/utils";

const passwordSchema = z
  .object({
    password_actual: z.string().min(1, "Requerido"),
    password_nuevo: z.string().min(8, "Mínimo 8 caracteres"),
    password_confirmar: z.string().min(1, "Requerido"),
  })
  .refine((d) => d.password_nuevo === d.password_confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["password_confirmar"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export default function PerfilPage() {
  const user = useAuthStore((s) => s.user);
  const initials = user ? (user.iniciales ?? getInitials(user.nombre)) : "??";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSubmitPassword = async (data: PasswordForm) => {
    try {
      await authApi.changePassword(data.password_actual, data.password_nuevo);
      toast.success("Contraseña actualizada");
      reset();
    } catch {
      toast.error("Error al cambiar la contraseña");
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      {/* User card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: user.avatarColor ?? "#2563EB" }}
          >
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{user.nombre}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <span className="text-xs text-muted-foreground capitalize mt-0.5 inline-block">
              {user.rol.replace("_", " ")}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Change password */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Cambiar contraseña</h3>
        </div>

        <form onSubmit={handleSubmit(onSubmitPassword)} className="px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Contraseña actual <span className="text-destructive">*</span></label>
            <Input
              {...register("password_actual")}
              type="password"
              placeholder="••••••••"
              error={!!errors.password_actual}
            />
            {errors.password_actual && <p className="text-xs text-danger">{errors.password_actual.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nueva contraseña <span className="text-destructive">*</span></label>
            <Input
              {...register("password_nuevo")}
              type="password"
              placeholder="Mínimo 8 caracteres"
              error={!!errors.password_nuevo}
            />
            {errors.password_nuevo && <p className="text-xs text-danger">{errors.password_nuevo.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Confirmar nueva contraseña <span className="text-destructive">*</span></label>
            <Input
              {...register("password_confirmar")}
              type="password"
              placeholder="Repetí la nueva contraseña"
              error={!!errors.password_confirmar}
            />
            {errors.password_confirmar && <p className="text-xs text-danger">{errors.password_confirmar.message}</p>}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" loading={isSubmitting}>
              Actualizar contraseña
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
