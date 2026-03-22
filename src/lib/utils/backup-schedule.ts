export type BackupSchedule =
  | { frequency: 'daily'; hour: number }
  | { frequency: 'weekly'; hour: number; dayOfWeek: number };

export const DEFAULT_SCHEDULE: BackupSchedule = { frequency: 'daily', hour: 2 };

export function parseBackupSchedule(raw: string | null | undefined): BackupSchedule {
  if (!raw) return DEFAULT_SCHEDULE;
  try {
    const parsed = JSON.parse(raw);
    const result = validateBackupScheduleInput(parsed);
    return result.ok ? result.value : DEFAULT_SCHEDULE;
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

type ValidationResult =
  | { ok: true; value: BackupSchedule }
  | { ok: false; message: string };

export function validateBackupScheduleInput(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { ok: false, message: 'Invalid input' };
  }
  const d = data as Record<string, unknown>;

  if (d.frequency !== 'daily' && d.frequency !== 'weekly') {
    return { ok: false, message: 'frequency must be "daily" or "weekly"' };
  }

  if (typeof d.hour !== 'number' || !Number.isInteger(d.hour) || d.hour < 0 || d.hour > 23) {
    return { ok: false, message: 'hour must be an integer between 0 and 23' };
  }

  if (d.frequency === 'weekly') {
    if (typeof d.dayOfWeek !== 'number' || !Number.isInteger(d.dayOfWeek) || d.dayOfWeek < 0 || d.dayOfWeek > 6) {
      return { ok: false, message: 'dayOfWeek must be an integer between 0 and 6 for weekly schedules' };
    }
    return { ok: true, value: { frequency: 'weekly', hour: d.hour, dayOfWeek: d.dayOfWeek } };
  }

  // daily — strip dayOfWeek even if present
  return { ok: true, value: { frequency: 'daily', hour: d.hour } };
}
