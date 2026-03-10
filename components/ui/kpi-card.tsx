"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "success" | "warning" | "danger" | "info";
  index?: number;
}

const variantStyles = {
  default: {
    icon: "bg-primary/10 text-primary",
    border: "border-border",
  },
  success: {
    icon: "bg-success-light text-success",
    border: "border-success/20",
  },
  warning: {
    icon: "bg-warning-light text-warning",
    border: "border-warning/20",
  },
  danger: {
    icon: "bg-danger-light text-danger",
    border: "border-danger/20",
  },
  info: {
    icon: "bg-info-light text-info",
    border: "border-info/20",
  },
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  index = 0,
}: KPICardProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "bg-card border rounded-xl p-5 flex flex-col gap-3",
        "hover:shadow-md transition-shadow duration-200",
        styles.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", styles.icon)}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              trend.value >= 0
                ? "text-success bg-success-light"
                : "text-danger bg-danger-light"
            )}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-sm font-medium text-foreground/80 mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
        {trend && (
          <p className="text-xs text-muted-foreground mt-1">{trend.label}</p>
        )}
      </div>
    </motion.div>
  );
}
