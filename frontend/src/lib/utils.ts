import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'dd/MM/yyyy', { locale: es });
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
}

export function formatTime(date: string | Date) {
  return format(new Date(date), 'HH:mm', { locale: es });
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function getAvatarColor(name: string) {
  const fallbackColors = ['#1e3a5f', '#0d7377', '#6b4fbb', '#c0392b', '#27ae60', '#f39c12', '#2980b9', '#8e44ad'];
  const colors = typeof document !== 'undefined'
    ? [
      getComputedStyle(document.documentElement).getPropertyValue('--theme-sidebar-active-bg').trim() || fallbackColors[0],
      getComputedStyle(document.documentElement).getPropertyValue('--color-navy-600').trim() || fallbackColors[1],
      getComputedStyle(document.documentElement).getPropertyValue('--color-gold-400').trim() || fallbackColors[2],
      getComputedStyle(document.documentElement).getPropertyValue('--theme-btn-danger-bg').trim() || fallbackColors[3],
      getComputedStyle(document.documentElement).getPropertyValue('--theme-badge-active-text').trim() || fallbackColors[4],
      getComputedStyle(document.documentElement).getPropertyValue('--theme-badge-manager-bg').trim() || fallbackColors[5],
      getComputedStyle(document.documentElement).getPropertyValue('--theme-calendar-active-button').trim() || fallbackColors[6],
      getComputedStyle(document.documentElement).getPropertyValue('--theme-calendar-now-indicator').trim() || fallbackColors[7],
    ]
    : fallbackColors;
  let hash = 0;
  for (const char of name) hash = char.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
