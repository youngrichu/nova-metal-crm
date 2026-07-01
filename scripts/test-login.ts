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

    // Step 2: load @better-auth/utils/password and inspect exports
    const pwModule = await import('@better-auth/utils/password') as any;
    console.log("\n=== @better-auth/utils/password exports ===");
    console.log(Object.keys(pwModule));

    // resolve the hash/verify functions regardless of export shape
    const hashFn: (p: string) => Promise<string> =
        typeof pwModule.hash === 'function' ? pwModule.hash
        : typeof pwModule?.password?.hash === 'function' ? pwModule.password.hash
        : typeof pwModule?.default?.hash === 'function' ? pwModule.default.hash
        : null;

    const verifyFn: (opts: { hash: string; password: string }) => Promise<boolean> =
        typeof pwModule.verify === 'function' ? pwModule.verify
        : typeof pwModule?.password?.verify === 'function' ? pwModule.password.verify
        : typeof pwModule?.default?.verify === 'function' ? pwModule.default.verify
        : null;

    if (!hashFn || !verifyFn) {
        console.error("Could not find hash/verify functions in module. Exports:", pwModule);
        process.exit(1);
    }

    // Step 3: hash a fresh password to compare format
    const freshHash = await hashFn(ADMIN_PASSWORD);
    console.log("\n=== Fresh hash of ADMIN_PASSWORD ===");
    console.log("Length :", freshHash.length);
    console.log("Full   :", freshHash);

    // Step 4: verify stored hash
    console.log("\n=== Verification ===");
    const storedValid = await verifyFn({ hash: storedHash, password: ADMIN_PASSWORD });
    console.log("Stored hash verifies:", storedValid);

    const freshValid = await verifyFn({ hash: freshHash, password: ADMIN_PASSWORD });
    console.log("Fresh  hash verifies:", freshValid);

    if (!storedValid && freshValid) {
        console.log("\n>>> Stored hash was created with a different hasher.");
        console.log(">>> Fix: run the cleanup SQL then re-seed:");
        console.log('>>>   DELETE FROM session WHERE user_id IN (SELECT id FROM "user" WHERE email = \'admin@novametal.com\');');
        console.log('>>>   DELETE FROM account WHERE user_id IN (SELECT id FROM "user" WHERE email = \'admin@novametal.com\');');
        console.log('>>>   DELETE FROM "user" WHERE email = \'admin@novametal.com\';');
        console.log(">>>   npx tsx scripts/seed.ts");
    } else if (!storedValid && !freshValid) {
        console.log("\n>>> Even fresh hashes fail -- @better-auth/utils is broken on this machine.");
    } else {
        console.log("\n>>> Password verification works. The issue is elsewhere in the app.");
    }
} finally {
    client.release();
    await pool.end();
}