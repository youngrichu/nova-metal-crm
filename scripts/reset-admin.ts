import "dotenv/config";
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from '../src/lib/server/db/schema';
import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const email = 'admin@novametal.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
    console.error("Set ADMIN_PASSWORD in .env first");
    process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
const raw = await pool.connect();

try {
    // 1. Clean slate
    console.log("Deleting old admin records...");
    await raw.query('DELETE FROM session WHERE user_id IN (SELECT id FROM "user" WHERE email=$1)', [email]);
    const del = await raw.query('DELETE FROM account WHERE user_id IN (SELECT id FROM "user" WHERE email=$1)', [email]);
    await raw.query('DELETE FROM "user" WHERE email=$1', [email]);
    console.log("Deleted " + del.rowCount + " account rows.");

    // 2. Create fresh admin via better-auth
    const auth = betterAuth({
        secret: process.env.BETTER_AUTH_SECRET,
        database: drizzleAdapter(db, { provider: "pg", schema }),
        emailAndPassword: { enabled: true }
    });

    console.log("\nCreating admin user, password = " + ADMIN_PASSWORD);
    const created = await auth.api.signUpEmail({
        body: { email: email, password: ADMIN_PASSWORD, name: "System Admin" }
    });
    if (!created || !created.user || !created.user.email) {
        console.error("signUpEmail did not return a user — check error output above");
        process.exit(1);
    }
    console.log("Created: " + created.user.email);

    // 3. Read back the stored hash
    const row = await raw.query(
        'SELECT password FROM account WHERE user_id=(SELECT id FROM "user" WHERE email=$1) AND provider_id=\'credential\'',
        [email]
    );
    const storedHash = row.rows[0] && row.rows[0].password;
    if (!storedHash) {
        console.error("No password in account row — seeding failed silently");
        process.exit(1);
    }
    console.log("\nStored hash  : " + storedHash);
    console.log("Hash length  : " + storedHash.length);

    // 4. Try to verify using node:crypto scrypt
    // better-auth stores format: hex(16-byte-salt) + ":" + hex(64-byte-derivedKey)
    const parts = storedHash.split(':');
    const salt = Buffer.from(parts[0], 'hex');
    const storedKey = Buffer.from(parts[1], 'hex');
    const keylen = storedKey.length;

    console.log("\nVerifying with node:crypto scrypt ...");
    const paramSets = [
        { N: 16384, r: 16, p: 2 },
        { N: 16384, r: 8,  p: 1 },
        { N: 65536, r: 8,  p: 1 },
        { N: 32768, r: 8,  p: 1 },
    ];

    let found = false;
    for (let i = 0; i < paramSets.length; i++) {
        const ps = paramSets[i];
        try {
            const derived = await scryptAsync(ADMIN_PASSWORD, salt, keylen, {
                N: ps.N, r: ps.r, p: ps.p, maxmem: 512 * 1024 * 1024
            });
            const ok = timingSafeEqual(storedKey, derived);
            console.log("  N=" + ps.N + " r=" + ps.r + " p=" + ps.p + " keylen=" + keylen + ": " + (ok ? "MATCH" : "no match"));
            if (ok) { found = true; break; }
        } catch (e) {
            console.log("  N=" + ps.N + " r=" + ps.r + " p=" + ps.p + ": error - " + e.message);
        }
    }

    console.log("");
    if (found) {
        console.log("Hash verified OK. If login still fails, paste this full output.");
    } else {
        console.log("No param set matched — paste this full output.");
    }

    console.log("\n=== Login credentials ===");
    console.log("  Email   : " + email);
    console.log("  Password: " + ADMIN_PASSWORD);

} finally {
    raw.release();
    await pool.end();
}
