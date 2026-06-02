import { user } from "./db/schema.js";
import { createDb } from "./db/client.js";
import { ensureDefaultAdmin } from "./bootstrap.js";
import { truncateAppTables } from "./test-utils/db.js";
import { beforeEach, describe, expect, it } from "vitest";

const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);

describe("default admin bootstrap", () => {
	beforeEach(async () => {
		await truncateAppTables();
	});

	it("creates a default admin account when no real admin exists", async () => {
		await ensureDefaultAdmin();

		const users = await db.select().from(user);
		expect(users).toHaveLength(1);
		expect(users[0]).toMatchObject({ username: "admin", role: "admin" });
	});

	it("does not recreate default admin when a real admin exists", async () => {
		await db.insert(user).values({
			id: "real-admin",
			name: "Real Admin",
			email: "real-admin@users.bfitlog.local",
			emailVerified: false,
			username: "realadmin",
			role: "admin",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await ensureDefaultAdmin();

		const users = await db.select().from(user);
		expect(users.map((item) => item.username)).toEqual(["realadmin"]);
	});
});
