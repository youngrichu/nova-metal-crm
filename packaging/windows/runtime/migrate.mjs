import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error('DATABASE_URL is required to run migrations');
}

const currentFile = fileURLToPath(import.meta.url);
const appDir = path.resolve(path.dirname(currentFile), '..');
const migrationsFolder = path.join(appDir, 'src', 'lib', 'server', 'db', 'migrations');

const pool = new Pool({
	connectionString: databaseUrl,
	max: 1
});

try {
	const db = drizzle(pool);
	await migrate(db, { migrationsFolder });
	console.log(`Migrations applied from ${migrationsFolder}`);
} finally {
	await pool.end();
}
