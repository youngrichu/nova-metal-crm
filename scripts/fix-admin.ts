import "dotenv/config";
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from '../src/lib/server/db/schema';
import bcrypt from "bcryptjs";

const email = 'admin@novametal.com';
const password = 'NovaAdmin2026';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
const raw = await pool.connect();

try {
    console.log("Step 1: deleting old admin records...");
    await raw.query('DELETE FROM session WHERE user_id IN (SELECT id FROM "user" WHERE email=$1)', [email]);
    await raw.query('DELETE FROM account WHERE user_id IN (SELECT id FROM "user" WHERE email=$1)', [email]);
    await raw.query('DELETE FROM "user" WHERE email=$1', [email]);

    const auth = betterAuth({
        secret: process.env.BETTER_AUTH_SECRET,
        database: drizzleAdapter(db, { provider: "pg", schema }),
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

    console.log("Step 2: creating admin user with password: " + password);
    const created = await auth.api.signUpEmail({
        body: { email: email, password: password, name: "System Admin" }
    });
    console.log("Created: " + created.user.email);

    await raw.query('UPDATE "user" SET role=\'admin\' WHERE email=$1', [email]);
    console.log("Role set to admin.");

    console.log("\n=== Use these EXACT credentials in the browser (copy-paste, do not type) ===");
    console.log("Email   : " + email);
    console.log("Password: " + password);

} finally {
    raw.release();
    await pool.end();
}