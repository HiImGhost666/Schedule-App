export type ShiftPreset = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
};

export type ShiftChunk = {
  startDate: Date;
  endDate: Date;
  presetId: string;
};

export function normalizeDate(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function toIsoDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function buildDateTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = normalizeDate(day);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

export function getPresetDurationHours(preset: ShiftPreset): number {
  const startMinutes = parseTimeToMinutes(preset.startTime);
  const endMinutes = parseTimeToMinutes(preset.endTime);
  const durationMinutes = endMinutes <= startMinutes
    ? 24 * 60 - startMinutes + endMinutes
    : endMinutes - startMinutes;

  return Math.round((durationMinutes / 60) * 10) / 10;
}

export function buildDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let cursor = normalizeDate(start);
  const endDay = normalizeDate(end);

  while (cursor.getTime() <= endDay.getTime()) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function isNextDay(prev: Date, next: Date): boolean {
  const nextExpected = normalizeDate(prev);
  nextExpected.setDate(nextExpected.getDate() + 1);
  return nextExpected.getTime() === normalizeDate(next).getTime();
}

export function buildScheduleChunks(
  dates: Date[],
  presetByDate: Record<string, string>,
  defaultPresetId: string,
): ShiftChunk[] {
  const sorted = [...dates].sort((a, b) => normalizeDate(a).getTime() - normalizeDate(b).getTime());
  const chunks: ShiftChunk[] = [];

  for (const date of sorted) {
    const key = toIsoDate(date);
    const presetId = presetByDate[key] ?? defaultPresetId;
    const current = chunks[chunks.length - 1];

    if (current && current.presetId === presetId && isNextDay(current.endDate, date)) {
      current.endDate = normalizeDate(date);
      continue;
    }

    chunks.push({
      startDate: normalizeDate(date),
      endDate: normalizeDate(date),
      presetId,
    });
  }

  return chunks;
}

export function buildChunkRange(chunk: ShiftChunk, preset: ShiftPreset) {
  const start = buildDateTime(chunk.startDate, preset.startTime);
  let end = buildDateTime(chunk.endDate, preset.endTime);

  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime());
    end.setDate(end.getDate() + 1);
  }

  return {
    start,
    end,
    hoursPerDay: getPresetDurationHours(preset),
  };
}
