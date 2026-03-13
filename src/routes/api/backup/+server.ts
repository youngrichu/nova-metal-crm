import { exec } from 'child_process';
import { gzipSync } from 'node:zlib';
import { promisify } from 'node:util';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const execAsync = promisify(exec);

let lastBackupAt: number | null = null;
const BACKUP_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user || locals.user.role !== 'admin') {
        throw error(403, 'Admin access required');
    }

    const now = Date.now();
    if (lastBackupAt && (now - lastBackupAt) < BACKUP_COOLDOWN_MS) {
        const secondsLeft = Math.ceil((BACKUP_COOLDOWN_MS - (now - lastBackupAt)) / 1000);
        throw error(429, `Please wait ${secondsLeft} seconds before requesting another backup`);
    }
    lastBackupAt = now;

    const date = new Date().toISOString().split('T')[0];

    const pgArgs = [
        `-h ${process.env.PGHOST || 'localhost'}`,
        `-U ${process.env.PGUSER || 'postgres'}`,
        `-d ${process.env.PGDATABASE || 'nova'}`
    ].join(' ');

    let stdout: Buffer;
    try {
        const result = await execAsync(`pg_dump ${pgArgs}`, {
            env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || '' },
            maxBuffer: 100 * 1024 * 1024,  // 100MB
            encoding: 'buffer',
            timeout: 120000  // 2 minute timeout
        });
        stdout = result.stdout as unknown as Buffer;
    } catch (err: any) {
        console.error('pg_dump failed:', err.stderr?.toString() || err.message);
        throw error(500, 'Database export failed');
    }

    if (!stdout || stdout.length === 0) {
        throw error(500, 'Database export produced empty output');
    }

    // Log audit event
    console.log(`[AUDIT] Database backup exported by user ${locals.user.id} at ${new Date().toISOString()}`);

    const compressed = gzipSync(stdout);

    return new Response(compressed, {
        headers: {
            'Content-Type': 'application/gzip',
            'Content-Disposition': `attachment; filename="nova_backup_${date}.sql.gz"`,
            'Content-Length': compressed.length.toString(),
            'Content-Encoding': 'identity'
        }
    });
};
