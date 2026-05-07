import { describe, it, expect } from 'vitest';
import {
  buildScheduleChunks,
  buildChunkRange,
  getPresetDurationHours,
  normalizeDate,
} from '@/components/schedule/shiftScheduling';

const preset = { id: 'morning', label: 'Turno manana', startTime: '08:00', endTime: '16:00' };
const nightPreset = { id: 'night', label: 'Turno noche', startTime: '22:00', endTime: '06:00' };

const day = (value: string) => normalizeDate(new Date(value));

describe('shiftScheduling helpers', () => {
  it('groups consecutive days with the same preset', () => {
    const dates = [day('2026-05-05'), day('2026-05-06'), day('2026-05-08')];
    const overrides = { '2026-05-08': 'evening' };

    const chunks = buildScheduleChunks(dates, overrides, 'morning');

    expect(chunks).toHaveLength(2);
    expect(chunks[0].startDate.toISOString().slice(0, 10)).toBe('2026-05-05');
    expect(chunks[0].endDate.toISOString().slice(0, 10)).toBe('2026-05-06');
    expect(chunks[1].startDate.toISOString().slice(0, 10)).toBe('2026-05-08');
  });

  it('computes durations for presets including overnight shifts', () => {
    expect(getPresetDurationHours(preset)).toBe(8);
    expect(getPresetDurationHours(nightPreset)).toBe(8);
  });

  it('builds date ranges for a chunk', () => {
    const chunk = { startDate: day('2026-05-05'), endDate: day('2026-05-06'), presetId: 'morning' };
    const range = buildChunkRange(chunk, preset);

    expect(range.start.toISOString()).toContain('T08:00');
    expect(range.end.toISOString()).toContain('T16:00');
  });
});
