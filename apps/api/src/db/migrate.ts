import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./client.js";

export async function runMigrations() {
	const db = createDb();
	await migrate(db, { migrationsFolder: "./drizzle" });
}

if (process.argv[1]?.endsWith("migrate.ts")) {
	await runMigrations();
}
