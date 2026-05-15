import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Admin access required');
  }

  if (process.platform !== 'win32') {
    throw error(500, 'Windows updater is only available on Windows production installs');
  }

  const updaterScript = env.NOVA_UPDATER_SCRIPT;
  if (!updaterScript) {
    throw error(500, 'NOVA_UPDATER_SCRIPT is not configured');
  }
  if (!existsSync(updaterScript)) {
    throw error(500, `Updater script not found: ${updaterScript}`);
  }
  const manifestUrl = env.VERSION_CHECK_URL;
  if (!manifestUrl) {
    throw error(500, 'VERSION_CHECK_URL is not configured');
  }

  try {
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      updaterScript,
      '-ManifestUrl',
      manifestUrl,
      '-Quiet'
    ], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
  } catch (err: any) {
    throw error(502, `Could not start Windows updater: ${err?.message ?? 'unknown error'}`);
  }

  console.log(`[AUDIT] App update triggered by user ${locals.user.id} at ${new Date().toISOString()}`);

  return json({ success: true });
};
