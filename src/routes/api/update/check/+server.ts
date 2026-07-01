import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { resolvePublicAppVersion } from '$lib/utils/app-version';
import { compareVersions, parseVersionJson } from '$lib/utils/version';
import { DEFAULT_VERSION_CHECK_URL } from '$lib/utils/update-config';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Admin access required');
  }

  const versionCheckUrl = env.VERSION_CHECK_URL || DEFAULT_VERSION_CHECK_URL;

  const currentVersion = resolvePublicAppVersion(publicEnv);

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

  let hasUpdate: boolean;
  try {
    hasUpdate = compareVersions(currentVersion, latestVersion);
  } catch {
    throw error(500, 'Invalid PUBLIC_APP_VERSION format. Expected X.Y.Z.');
  }

  return json({
    currentVersion,
    latestVersion,
    hasUpdate,
    changelog
  });
};
