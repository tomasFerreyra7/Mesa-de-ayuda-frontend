import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, format = 'dd/MM/yyyy') {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return format.replace('dd', day).replace('MM', month).replace('yyyy', year.toString()).replace('HH', hours).replace('mm', minutes);
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (date == null) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const time = d.getTime();
  if (Number.isNaN(time)) return '—';
  const now = new Date();
  const diffMs = now.getTime() - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'ahora mismo';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return formatDate(d);
}

export function getSLAStatus(slaVenceEn: string | null, estado: string): 'ok' | 'warning' | 'overdue' | 'resolved' {
  if (estado === 'Resuelto' || estado === 'Cerrado') return 'resolved';
  if (!slaVenceEn) return 'ok';
  const vence = new Date(slaVenceEn);
  const now = new Date();
  const diffHours = (vence.getTime() - now.getTime()) / 3600000;
  if (diffHours < 0) return 'overdue';
  if (diffHours < 2) return 'warning';
  return 'ok';
}

export function getSLAPriority(prioridad: string): string {
  const map: Record<string, string> = {
    Critica: '4h',
    Alta: '8h',
    Media: '24h',
    Baja: '72h',
  };
  return map[prioridad] ?? '—';
}

export function truncate(str: string, length = 60): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatMoney(amount: number | null, currency = 'ARS'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

