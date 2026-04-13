import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'navy' | 'gold' | 'green' | 'purple';
  className?: string;
}

const colorMap = {
  navy:   { bg: 'bg-navy-800',  light: 'bg-navy-50',   text: 'text-navy-700' },
  gold:   { bg: 'bg-red-500',   light: 'bg-red-50',    text: 'text-red-500'  },
  green:  { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600' },
  purple: { bg: 'bg-lilac-400', light: 'bg-lilac-50',  text: 'text-lilac-600' },
};

export function StatCard({ title, value, icon: Icon, trend, color = 'navy', className }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={cn('card p-7 flex items-center gap-5 hover:shadow-md transition-shadow', className)}>
      <div className={cn('p-4 rounded-xl flex-shrink-0', c.light)}>
        <Icon className={cn('h-6 w-6', c.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider leading-relaxed">{title}</p>
        <p className="text-2xl font-bold text-navy-800 mt-1">{value}</p>
        {trend && (
          <p className="text-xs text-navy-400 mt-0.5">
            <span className={trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}>
              {trend.value >= 0 ? '+' : ''}{trend.value}
            </span>{' '}
            {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
