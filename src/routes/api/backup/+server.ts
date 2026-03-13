import { execFile } from 'child_process';
import { gzipSync } from 'node:zlib';
import { promisify } from 'node:util';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const execFileAsync = promisify(execFile);

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

    const date = new Date().toISOString().split('T')[0];

    const dbUrl = env.DATABASE_URL;
    if (!dbUrl) throw error(500, 'DATABASE_URL not configured');

    const parsed = new URL(dbUrl);
    const pgArgs: string[] = [
        '-h', parsed.hostname || 'localhost',
        '-p', parsed.port || '5432',
        '-d', parsed.pathname.slice(1)
    ];
    if (parsed.username) pgArgs.push('-U', parsed.username);
    const pgPassword = parsed.password ? decodeURIComponent(parsed.password) : (process.env.PGPASSWORD || '');

    // pg_dump may not be in the PATH inherited by the Node.js process (e.g. Homebrew on macOS).
    // Augment PATH with common PostgreSQL binary locations so exec can find it.
    const pgBinDirs = [
        '/opt/homebrew/opt/postgresql@17/bin',
        '/opt/homebrew/opt/postgresql@16/bin',
        '/opt/homebrew/opt/postgresql@15/bin',
        '/opt/homebrew/bin',
        '/usr/local/bin',
        '/usr/bin',
    ].join(':');
    const augmentedEnv = {
        ...process.env,
        PATH: `${pgBinDirs}:${process.env.PATH || env.PATH || ''}`,
        PGPASSWORD: pgPassword,
    };

    let stdout: Buffer;
    try {
        const result = await execFileAsync('pg_dump', pgArgs, {
            env: augmentedEnv,
            maxBuffer: 100 * 1024 * 1024,  // 100MB
            encoding: 'buffer',
            timeout: 120000  // 2 minute timeout
        });
        stdout = result.stdout as unknown as Buffer;
    } catch (err: any) {
        const detail = err.stderr?.toString() || err.message || 'unknown error';
        console.error('pg_dump failed:', detail);
        throw error(500, `Database export failed: ${detail}`);
    }

    if (!stdout || stdout.length === 0) {
        throw error(500, 'Database export produced empty output');
    }

    lastBackupAt = now;
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
