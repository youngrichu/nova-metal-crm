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

    const row = await raw.query(
        'SELECT password FROM account WHERE user_id=(SELECT id FROM "user" WHERE email=$1) AND provider_id=\'credential\'',
        [email]
    );
    const storedHash = row.rows[0] && row.rows[0].password;
    console.log("Stored hash: " + storedHash);

    console.log("\nStep 3: verifying stored hash directly with bcryptjs (no better-auth involved)...");
    const directCheck = await bcrypt.compare(password, storedHash);
    console.log("bcrypt.compare result: " + directCheck);

    console.log("\nStep 4: calling auth.api.signInEmail directly in this same process (no browser involved)...");
    try {
        const signedIn = await auth.api.signInEmail({
            body: { email: email, password: password }
        });
        console.log("signInEmail SUCCESS. User: " + signedIn.user.email);
    } catch (e: any) {
        console.error("signInEmail FAILED: " + (e.message || e));
    }

    console.log("\n=== Use these EXACT credentials in the browser (copy-paste, do not type) ===");
    console.log("Email   : " + email);
    console.log("Password: " + password);

} finally {
    raw.release();
    await pool.end();
}
