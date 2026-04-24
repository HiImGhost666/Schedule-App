import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isDarkThemePreset } from '@/config/theme';
import { useUIStore } from '@/store/uiStore';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'navy' | 'gold' | 'green' | 'purple';
  className?: string;
}

const colorMap = {
  navy:   { bg: 'bg-navy-800',    light: 'bg-navy-50',    text: 'text-navy-700' },
  gold:   { bg: 'bg-red-500',     light: 'bg-red-50',     text: 'text-red-500'  },
  green:  { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600' },
  purple: { bg: 'bg-lilac-400',   light: 'bg-lilac-50',   text: 'text-lilac-600' },
};

export function StatCard({ title, value, icon: Icon, trend, color = 'navy', className }: StatCardProps) {
  const activeTheme = useUIStore(
    (s) => s.themePresetHoverPreview ?? s.themeDraft ?? s.themeConfig,
  );
  const isDark = isDarkThemePreset(activeTheme);
  const useNeutralIcon = isDark && color !== 'navy';
  const c = useNeutralIcon ? colorMap.navy : colorMap[color];
  return (
    <div className={cn('card p-4 md:p-7 flex items-center gap-3.5 md:gap-5 hover:shadow-md transition-shadow', className)}>
      {/* Icon — smaller on mobile */}
      <div className={cn('p-2.5 md:p-4 rounded-xl flex-shrink-0', c.light)}>
        <Icon className={cn('h-5 w-5 md:h-6 md:w-6', c.text)} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] md:text-xs font-semibold text-navy-400 uppercase tracking-wider leading-tight">
          {title}
        </p>
        <p className="text-xl md:text-2xl font-bold text-navy-800 mt-0.5 md:mt-1">{value}</p>
        {trend && (
          <p className="text-xs text-navy-400 mt-0.5">
            <span
              className={
                trend.value >= 0
                  ? (isDark ? 'text-navy-500' : 'text-emerald-600')
                  : (isDark ? 'text-red-400' : 'text-red-500')
              }
            >
              {trend.value >= 0 ? '+' : ''}{trend.value}
            </span>{' '}
            {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}