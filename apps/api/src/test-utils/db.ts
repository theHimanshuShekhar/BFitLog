import pg from "pg";

const databaseUrl =
	process.env.DATABASE_URL ??
	"postgres://bfitlog:bfitlog@localhost:5432/bfitlog";

export async function truncateAppTables() {
	const client = new pg.Client({ connectionString: databaseUrl });
	await client.connect();
	try {
		await client.query(
			'TRUNCATE TABLE "partner_links", "body_weight_logs", "body_weight_goals", "account", "session", "verification", "user" CASCADE',
		);
	} finally {
		await client.end();
	}
}
