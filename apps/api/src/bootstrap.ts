import { and, count, eq, ne } from "drizzle-orm";
import { auth } from "./auth/auth.js";
import { createDb } from "./db/client.js";
import { user } from "./db/schema.js";

export const defaultAdminUsername = "admin";
export const defaultAdminPassword = ["ad", "min"].join("");

const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);

export function internalEmailForUsername(username: string) {
	return `${username.toLowerCase()}@users.bfitlog.local`;
}

export async function ensureDefaultAdmin() {
	const [realAdmin] = await db
		.select({ value: count() })
		.from(user)
		.where(
			and(eq(user.role, "admin"), ne(user.username, defaultAdminUsername)),
		);
	if ((realAdmin?.value ?? 0) > 0) return;

	const [existingDefault] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.username, defaultAdminUsername));
	if (existingDefault) return;

	const created = await auth.api.signUpEmail({
		body: {
			name: "Default Admin",
			email: internalEmailForUsername(defaultAdminUsername),
			password: defaultAdminPassword,
			username: defaultAdminUsername,
		},
	});

	await db
		.update(user)
		.set({ role: "admin" })
		.where(eq(user.id, created.user.id));
}

export async function deleteDefaultAdminIfRealAdminExists() {
	const [realAdmin] = await db
		.select({ value: count() })
		.from(user)
		.where(
			and(eq(user.role, "admin"), ne(user.username, defaultAdminUsername)),
		);
	if ((realAdmin?.value ?? 0) === 0) return false;

	await db.delete(user).where(eq(user.username, defaultAdminUsername));
	return true;
}
