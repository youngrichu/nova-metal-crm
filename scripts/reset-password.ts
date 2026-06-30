import "dotenv/config";
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

async function main() {
	const newPassword = process.env.ADMIN_PASSWORD || "admin123";
	const email = "admin@novametal.com";

	const { Scrypt } = await import("oslo/password");
	const scrypt = new Scrypt();
	const hash = await scrypt.hash(newPassword);

	const client = await pool.connect();
	try {
		const sql = 'UPDATE account SET password = $1 WHERE user_id = (SELECT id FROM "user" WHERE email = $2)';
		const result = await client.query(sql, [hash, email]);
		if (result.rowCount === 0) {
			console.error("No account found for", email, "- run the seed script first");
		} else {
			console.log(`Password reset to "${newPassword}" for ${email}`);
		}
	} finally {
		client.release();
		await pool.end();
	}
}

main().catch(console.error);
