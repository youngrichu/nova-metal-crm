import { error } from '@sveltejs/kit';
import { spawnSync } from 'child_process';
import { gzipSync } from 'node:zlib';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user || locals.user.role !== 'admin') {
        throw error(403, 'Admin access required');
    }

    const date = new Date().toISOString().split('T')[0];

    const result = spawnSync('pg_dump', [
        '-h', process.env.PGHOST || 'localhost',
        '-U', process.env.PGUSER || 'postgres',
        '-d', process.env.PGDATABASE || 'nova'
    ], {
        env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD },
        maxBuffer: 100 * 1024 * 1024  // 100MB limit
    });

    if (result.status !== 0 || !result.stdout || result.stdout.length === 0) {
        throw error(500, 'Database export failed');
    }

    const compressed = gzipSync(result.stdout);

    return new Response(compressed, {
        headers: {
            'Content-Type': 'application/gzip',
            'Content-Disposition': `attachment; filename="nova_backup_${date}.sql.gz"`,
            'Content-Length': compressed.length.toString()
        }
    });
};
