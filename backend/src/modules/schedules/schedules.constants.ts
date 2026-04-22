export const SCHEDULE_TYPES = ['guardia', 'ausencia', 'vacaciones', 'formacion', 'otro', 'excepcion'] as const;
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];
