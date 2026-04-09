// ─────────────────────────────────────────────────────────────────────────────
// Calendarios Laborales 2026
// Fuente: Calendario Laboral 2026 - Tenerife y Calendario Laboral 2026 - Las Palmas
// ─────────────────────────────────────────────────────────────────────────────

export interface HolidayEntry {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'nacional' | 'autonomica' | 'local' | 'mejora';
  /** 'both' = aplica a Tenerife Y Las Palmas */
  calendar: 'tenerife' | 'las_palmas' | 'both';
}

export const HOLIDAYS_2026: HolidayEntry[] = [
  // ── Festivos Nacionales (comunes a ambas islas) ───────────────────────────
  { date: '2026-01-01', name: 'Año Nuevo',                        type: 'nacional',   calendar: 'both'       },
  { date: '2026-01-06', name: 'Reyes Magos',                      type: 'nacional',   calendar: 'both'       },
  { date: '2026-04-03', name: 'Viernes Santo',                    type: 'nacional',   calendar: 'both'       },
  { date: '2026-05-01', name: 'Día del Trabajo',                  type: 'nacional',   calendar: 'both'       },
  { date: '2026-10-12', name: 'Fiesta Nacional de España',        type: 'nacional',   calendar: 'both'       },
  { date: '2026-12-08', name: 'Inmaculada Concepción',            type: 'nacional',   calendar: 'both'       },
  { date: '2026-12-25', name: 'Navidad',                          type: 'nacional',   calendar: 'both'       },
  // Nota: 15-ago (Asunción) cae en Sábado → sin impacto en días laborables

  // ── Festivos Autonómicos – Canarias (comunes) ─────────────────────────────
  { date: '2026-04-02', name: 'Jueves Santo',                     type: 'autonomica', calendar: 'both'       },
  // Nota: 30-may (Día de Canarias) cae en Sábado → sin impacto en días laborables
  { date: '2026-11-02', name: 'Todos los Santos (sustitución)',   type: 'autonomica', calendar: 'both'       },
  // 01-nov cae en Domingo → traslado al lunes 02-nov

  // ── Mejoras de Convenio (comunes) ─────────────────────────────────────────
  { date: '2026-12-24', name: 'Nochebuena (Mejora Convenio)',     type: 'mejora',     calendar: 'both'       },
  { date: '2026-12-31', name: 'Nochevieja (Mejora Convenio)',     type: 'mejora',     calendar: 'both'       },

  // ── Festivos Locales exclusivos TENERIFE ──────────────────────────────────
  { date: '2026-02-02', name: 'Virgen de Candelaria',             type: 'local',      calendar: 'tenerife'   },
  { date: '2026-02-17', name: 'Martes de Carnaval',               type: 'local',      calendar: 'tenerife'   },

  // ── Festivos Locales exclusivos LAS PALMAS ────────────────────────────────
  { date: '2026-02-17', name: 'Martes de Carnaval',               type: 'local',      calendar: 'las_palmas' },
  { date: '2026-06-24', name: 'Día de San Juan',                  type: 'local',      calendar: 'las_palmas' },
  { date: '2026-09-08', name: 'Patrona de Gran Canaria',          type: 'local',      calendar: 'las_palmas' },
];

// ─── Días de jornada reducida (mejoras convenio, no día libre completo) ──────
export interface PartialDayEntry {
  date: string;
  name: string;
  calendar: 'tenerife' | 'las_palmas' | 'both';
}

export const PARTIAL_DAYS_2026: PartialDayEntry[] = [
  { date: '2026-01-05', name: 'Víspera de Reyes (tarde libre)',    calendar: 'both'       },
  { date: '2026-06-23', name: 'Víspera de San Juan (tarde libre)', calendar: 'las_palmas' },
];

// ─── Tipos ───────────────────────────────────────────────────────────────────
export type CalendarType = 'tenerife' | 'las_palmas' | 'none';

export const CALENDAR_LABELS: Record<CalendarType, string> = {
  tenerife:   'Tenerife',
  las_palmas: 'Las Palmas',
  none:       'Sin festivos',
};

export const HOLIDAY_TYPE_LABELS: Record<HolidayEntry['type'], string> = {
  nacional:   'Nacional',
  autonomica: 'Autonómica',
  local:      'Local',
  mejora:     'Mejora convenio',
};

export const HOLIDAY_COLORS: Record<HolidayEntry['type'], string> = {
  nacional:   '#dc2626',
  autonomica: '#ea580c',
  local:      '#d97706',
  mejora:     '#65a30d',
};

// ─── Utilidades ──────────────────────────────────────────────────────────────

/** Devuelve los festivos completos aplicables al calendario seleccionado */
export function getHolidaysForCalendar(cal: CalendarType): HolidayEntry[] {
  if (cal === 'none') return [];
  return HOLIDAYS_2026.filter((h) => h.calendar === 'both' || h.calendar === cal);
}

/** Devuelve los días de jornada reducida aplicables */
export function getPartialDaysForCalendar(cal: CalendarType): PartialDayEntry[] {
  if (cal === 'none') return [];
  return PARTIAL_DAYS_2026.filter((h) => h.calendar === 'both' || h.calendar === cal);
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Cuenta los días laborables entre dos fechas (inclusive).
 * @param excludeWeekends  true = saltar sábados y domingos
 * @param cal              Calendario de festivos a aplicar
 */
export function countWorkingDays(
  start: Date,
  end: Date,
  excludeWeekends: boolean,
  cal: CalendarType,
): number {
  const holidays = new Set(getHolidaysForCalendar(cal).map((h) => h.date));

  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (cur <= endDay) {
    const dow = cur.getDay(); // 0 = Dom, 6 = Sáb
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = holidays.has(toISODate(cur));

    if (!(excludeWeekends && isWeekend) && !isHoliday) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Indica si una fecha concreta es festivo en el calendario dado */
export function isHolidayDate(date: Date, cal: CalendarType): boolean {
  if (cal === 'none') return false;
  const iso = toISODate(date);
  return getHolidaysForCalendar(cal).some((h) => h.date === iso);
}
