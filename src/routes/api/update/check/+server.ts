import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { PUBLIC_APP_VERSION } from '$env/static/public';
import { compareVersions, parseVersionJson } from '$lib/utils/version';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Admin access required');
  }

  const versionCheckUrl = env.VERSION_CHECK_URL;
  if (!versionCheckUrl) {
    throw error(500, 'VERSION_CHECK_URL not configured');
  }

  const currentVersion = PUBLIC_APP_VERSION || '0.0.0';

  let raw: string;
  try {
    const res = await fetch(versionCheckUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw error(502, `Could not reach update server (HTTP ${res.status})`);
    }
    raw = await res.text();
  } catch (err: any) {
    if (err?.status) throw err; // re-throw SvelteKit errors
    throw error(502, 'Could not reach update server. Check your internet connection.');
  }

  let latestVersion: string;
  let changelog: string;
  try {
    ({ version: latestVersion, changelog } = parseVersionJson(raw));
  } catch {
    throw error(502, 'Invalid version data from update server');
  }

  return json({
    currentVersion,
    latestVersion,
    hasUpdate: compareVersions(currentVersion, latestVersion),
    changelog
  });
};
