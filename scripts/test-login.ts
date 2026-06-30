import "dotenv/config";
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from '../src/lib/server/db/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5173",
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: true },
    user: {
        additionalFields: {
            role: { type: "string", required: true, defaultValue: "sales" }
        }
    }
});

console.log("Testing login with admin@novametal.com / admin123...");

try {
    const result = await auth.api.signInEmail({
        body: { email: "admin@novametal.com", password: "admin123" }
    });
    console.log("SUCCESS - user:", result?.user?.email);
} catch (e: any) {
    console.error("FAILED:", e.message || e);
}

await pool.end();
