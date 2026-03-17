import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Admin access required');
  }

  const watchtowerUrl = env.WATCHTOWER_API_URL;
  const watchtowerToken = env.WATCHTOWER_API_TOKEN;

  if (!watchtowerUrl || !watchtowerToken) {
    throw error(500, 'Watchtower is not configured (WATCHTOWER_API_URL / WATCHTOWER_API_TOKEN missing)');
  }

  let res: Response;
  try {
    res = await fetch(`${watchtowerUrl}/v1/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${watchtowerToken}` },
      signal: AbortSignal.timeout(10000)
    });
  } catch (err: any) {
    throw error(502, 'Could not reach Watchtower. Is it running?');
  }

  if (!res.ok) {
    const message =
      res.status === 401
        ? 'Update service authentication failed. Check WATCHTOWER_API_TOKEN.'
        : `Watchtower returned an unexpected error (HTTP ${res.status})`;
    throw error(502, message);
  }

  console.log(`[AUDIT] App update triggered by user ${locals.user.id} at ${new Date().toISOString()}`);

  return json({ success: true });
};
