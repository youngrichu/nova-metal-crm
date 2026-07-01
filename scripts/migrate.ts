import "dotenv/config";
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

console.log("Running migrations from src/lib/server/db/migrations ...");
await migrate(db, { migrationsFolder: './src/lib/server/db/migrations' });
console.log("Migrations complete.");

await pool.end();