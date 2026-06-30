import "dotenv/config";
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from '../src/lib/server/db/schema';
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
const raw = await pool.connect();

const email = "admin@novametal.com";
const password = process.env.ADMIN_PASSWORD || "admin1234";

async function main() {
    console.log("Cleaning up old admin records...");
    await raw.query('DELETE FROM session WHERE user_id IN (SELECT id FROM "user" WHERE email=$1)', [email]);
    await raw.query('DELETE FROM account WHERE user_id IN (SELECT id FROM "user" WHERE email=$1)', [email]);
    await raw.query('DELETE FROM "user" WHERE email=$1', [email]);

    const auth = betterAuth({
        secret: process.env.BETTER_AUTH_SECRET,
        database: drizzleAdapter(db, {
            provider: "pg",
            schema
        }),
        emailAndPassword: {
            enabled: true,
            password: {
                hash: function(pw) {
                    return bcrypt.hash(pw, 10);
                },
                verify: function(data) {
                    return bcrypt.compare(data.password, data.hash);
                }
            }
        }
    });

    console.log("Creating admin user with password: " + password);
    try {
        const user = await auth.api.signUpEmail({
            body: {
                email: email,
                password: password,
                name: "System Admin"
            }
        });
        await raw.query('UPDATE "user" SET role=\'admin\' WHERE email=$1', [email]);
        console.log("Admin user created: " + user.user.email);
        console.log("Role set to admin.");
        console.log("Login with  email: " + email + "  password: " + password);
    } catch (e: any) {
        console.error("Failed:", e.message || e);
    }

    raw.release();
    await pool.end();
}

main();
