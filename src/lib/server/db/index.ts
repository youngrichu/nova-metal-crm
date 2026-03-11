import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { env } from '$env/dynamic/private';
import * as schema from './schema/index';

const pool = new Pool({
	connectionString: env.DATABASE_URL,
	max: 15,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });
