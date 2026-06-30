import "dotenv/config";
import pkg from 'pg';
const { Pool } = pkg;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
    console.error("ADMIN_PASSWORD is not set in .env");
    process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
    const email = "admin@novametal.com";

    // Step 1: get the full stored hash
    const result = await client.query(
        `SELECT a.password FROM account a
         JOIN "user" u ON a.user_id = u.id
         WHERE u.email = $1 AND a.provider_id = 'credential'`,
        [email]
    );

    if (result.rows.length === 0) {
        console.error("No credential account found for", email);
        console.log("Run: npx tsx scripts/seed.ts");
        process.exit(1);
    }

    const storedHash = result.rows[0].password as string;
    console.log("=== Stored hash info ===");
    console.log("Length :", storedHash.length);
    console.log("Full   :", storedHash);

    // Step 2: hash a fresh password to see what format better-auth produces
    const { password: passwordUtils } = await import('@better-auth/utils/password');
    const freshHash = await passwordUtils.hash(ADMIN_PASSWORD);
    console.log("\n=== Fresh hash of ADMIN_PASSWORD ===");
    console.log("Length :", freshHash.length);
    console.log("Full   :", freshHash);

    // Step 3: verify the STORED hash against ADMIN_PASSWORD
    console.log("\n=== Verification ===");
    const storedValid = await passwordUtils.verify({ hash: storedHash, password: ADMIN_PASSWORD });
    console.log("Stored hash verifies:", storedValid);

    // Step 4: verify a freshly generated hash as sanity check
    const freshValid = await passwordUtils.verify({ hash: freshHash, password: ADMIN_PASSWORD });
    console.log("Fresh  hash verifies:", freshValid);

    if (!storedValid && freshValid) {
        console.log("\n>>> The stored hash was created with a different hasher (e.g. oslo/scrypt).");
        console.log(">>> Fix: delete the account row and re-run: npx tsx scripts/seed.ts");
    } else if (!storedValid && !freshValid) {
        console.log("\n>>> Even fresh hashes fail to verify — something is wrong with @better-auth/utils.");
    } else {
        console.log("\n>>> Password verification is WORKING. The login issue is elsewhere.");
    }
} finally {
    client.release();
    await pool.end();
}
