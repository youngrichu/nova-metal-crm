import { describe, it, expect } from 'vitest';
import {
  parseBackupSchedule,
  validateBackupScheduleInput,
  DEFAULT_SCHEDULE
} from './backup-schedule';

describe('DEFAULT_SCHEDULE', () => {
  it('is daily at hour 2', () => {
    expect(DEFAULT_SCHEDULE).toEqual({ frequency: 'daily', hour: 2 });
  });
});

describe('parseBackupSchedule', () => {
  it('returns parsed daily schedule', () => {
    expect(parseBackupSchedule('{"frequency":"daily","hour":3}')).toEqual({
      frequency: 'daily',
      hour: 3
    });
  });

  it('returns parsed weekly schedule', () => {
    expect(parseBackupSchedule('{"frequency":"weekly","hour":2,"dayOfWeek":0}')).toEqual({
      frequency: 'weekly',
      hour: 2,
      dayOfWeek: 0
    });
  });

  it('returns default for empty string', () => {
    expect(parseBackupSchedule('')).toEqual(DEFAULT_SCHEDULE);
  });

  it('returns default for null-ish input', () => {
    expect(parseBackupSchedule(null as any)).toEqual(DEFAULT_SCHEDULE);
  });

  it('returns default for invalid JSON', () => {
    expect(parseBackupSchedule('not json')).toEqual(DEFAULT_SCHEDULE);
  });

  it('returns default for unknown frequency', () => {
    expect(parseBackupSchedule('{"frequency":"monthly","hour":2}')).toEqual(DEFAULT_SCHEDULE);
  });

  it('returns default for hour out of range', () => {
    expect(parseBackupSchedule('{"frequency":"daily","hour":25}')).toEqual(DEFAULT_SCHEDULE);
  });

  it('returns default for weekly without dayOfWeek', () => {
    expect(parseBackupSchedule('{"frequency":"weekly","hour":2}')).toEqual(DEFAULT_SCHEDULE);
  });

  it('returns default for dayOfWeek out of range', () => {
    expect(parseBackupSchedule('{"frequency":"weekly","hour":2,"dayOfWeek":7}')).toEqual(DEFAULT_SCHEDULE);
  });

  it('strips dayOfWeek from daily schedule even if present in stored JSON', () => {
    const result = parseBackupSchedule('{"frequency":"daily","hour":2,"dayOfWeek":3}');
    expect(result).toEqual({ frequency: 'daily', hour: 2 });
    expect((result as any).dayOfWeek).toBeUndefined();
  });
});

describe('validateBackupScheduleInput', () => {
  it('accepts valid daily input', () => {
    expect(validateBackupScheduleInput({ frequency: 'daily', hour: 0 })).toEqual({
      ok: true,
      value: { frequency: 'daily', hour: 0 }
    });
  });

  it('accepts valid weekly input', () => {
    expect(validateBackupScheduleInput({ frequency: 'weekly', hour: 23, dayOfWeek: 6 })).toEqual({
      ok: true,
      value: { frequency: 'weekly', hour: 23, dayOfWeek: 6 }
    });
  });

  it('strips dayOfWeek when frequency is daily', () => {
    const result = validateBackupScheduleInput({ frequency: 'daily', hour: 2, dayOfWeek: 3 });
    expect(result.ok).toBe(true);
    expect((result as any).value.dayOfWeek).toBeUndefined();
  });

  it('rejects unknown frequency', () => {
    expect(validateBackupScheduleInput({ frequency: 'monthly', hour: 2 })).toMatchObject({ ok: false });
  });

  it('rejects hour below 0', () => {
    expect(validateBackupScheduleInput({ frequency: 'daily', hour: -1 })).toMatchObject({ ok: false });
  });

  it('rejects hour above 23', () => {
    expect(validateBackupScheduleInput({ frequency: 'daily', hour: 24 })).toMatchObject({ ok: false });
  });

  it('rejects weekly without dayOfWeek', () => {
    expect(validateBackupScheduleInput({ frequency: 'weekly', hour: 2 })).toMatchObject({ ok: false });
  });

  it('rejects dayOfWeek below 0', () => {
    expect(validateBackupScheduleInput({ frequency: 'weekly', hour: 2, dayOfWeek: -1 })).toMatchObject({ ok: false });
  });

  it('rejects dayOfWeek above 6', () => {
    expect(validateBackupScheduleInput({ frequency: 'weekly', hour: 2, dayOfWeek: 7 })).toMatchObject({ ok: false });
  });
});
