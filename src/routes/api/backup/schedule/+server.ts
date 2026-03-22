import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema/settings';
import { eq } from 'drizzle-orm';
import { parseBackupSchedule, validateBackupScheduleInput } from '$lib/utils/backup-schedule';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Admin access required');
  }

  const rows = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'backup_schedule'));

  const raw = rows[0]?.value ?? '';
  return json(parseBackupSchedule(raw));
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Admin access required');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON body');
  }

  const result = validateBackupScheduleInput(body);
  if (!result.ok) {
    throw error(400, result.message);
  }

  const valueJson = JSON.stringify(result.value);
  const now = new Date();

  await db
    .insert(systemSettings)
    .values({
      key: 'backup_schedule',
      value: valueJson,
      updatedBy: locals.user.id,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: valueJson,
        updatedBy: locals.user.id,
        updatedAt: now
      }
    });

  return json({ message: 'Backup schedule saved' });
};
