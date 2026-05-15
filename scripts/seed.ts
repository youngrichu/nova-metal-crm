import "dotenv/config";
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from '../src/lib/server/db/schema';

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema
    }),
    emailAndPassword: { enabled: true }
});

async function main() {
    console.log("Seeding initial admin user...");

    try {
        const user = await auth.api.signUpEmail({
            body: {
                email: "admin@novametal.com",
                password: process.env.ADMIN_PASSWORD || "defaultAdminPassword",
                name: "System Admin"
            }
        });
        
        console.log("Admin user created successfully:", user?.user?.email);
    } catch (e: any) {
        console.error("Failed to seed admin user:", e.message || e);
    }

    process.exit(0);
}

main();
