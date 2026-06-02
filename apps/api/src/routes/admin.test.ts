import { createApp } from "../app.js";
import { ensureDefaultAdmin } from "../bootstrap.js";
import { truncateAppTables } from "../test-utils/db.js";
import { beforeEach, describe, expect, it } from "vitest";

async function createDefaultAdminSession() {
	const app = createApp();
	await ensureDefaultAdmin();
	const login = await app.request("/api/auth/sign-in/username", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ username: "admin", password: "admin" }),
	});
	return { app, cookie: login.headers.get("set-cookie") ?? "" };
}

async function createRealAdminSession() {
	const { app, cookie } = await createDefaultAdminSession();
	const create = await app.request("/admin/users", {
		method: "POST",
		headers: { "content-type": "application/json", cookie },
		body: JSON.stringify({
			username: "realadmin",
			displayName: "Real Admin",
			password: "password1234",
		}),
	});
	expect(create.status).toBe(201);
	const login = await app.request("/api/auth/sign-in/username", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ username: "realadmin", password: "password1234" }),
	});
	return { app, cookie: login.headers.get("set-cookie") ?? "" };
}

describe("admin routes", () => {
	beforeEach(async () => {
		await truncateAppTables();
	});

	it("requires authentication", async () => {
		const app = createApp();
		const response = await app.request("/admin/users");
		expect(response.status).toBe(401);
	});

	it("lets the default admin create the first real admin and deletes the default admin", async () => {
		const { app, cookie } = await createDefaultAdminSession();

		const response = await app.request("/admin/users", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({
				username: "realadmin",
				displayName: "Real Admin",
				password: "password1234",
			}),
		});
		expect(response.status).toBe(201);
		const body = await response.json();
		expect(body.user).toMatchObject({ username: "realadmin", role: "admin" });
		expect(body.defaultAdminDeleted).toBe(true);

		const users = await app.request("/admin/users", { headers: { cookie } });
		expect(users.status).toBe(401);

		const login = await app.request("/api/auth/sign-in/username", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ username: "admin", password: "admin" }),
		});
		expect(login.status).toBe(401);
	});

	it("creates later users as members by default", async () => {
		const { app, cookie } = await createRealAdminSession();
		const create = await app.request("/admin/users", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({
				username: "member",
				displayName: "Member",
				password: "password1234",
			}),
		});
		expect(create.status).toBe(201);
		const body = await create.json();
		expect(body.user).toMatchObject({ username: "member", role: "member" });
	});

	it("lets admins reset another user's password", async () => {
		const { app, cookie } = await createRealAdminSession();
		const create = await app.request("/admin/users", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({
				username: "member",
				displayName: "Member",
				password: "password1234",
			}),
		});
		const createdBody = await create.json();

		const reset = await app.request(`/admin/users/${createdBody.user.id}/password`, {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({ newPassword: "newpassword123" }),
		});
		expect(reset.status).toBe(200);

		const login = await app.request("/api/auth/sign-in/username", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ username: "member", password: "newpassword123" }),
		});
		expect(login.status).toBe(200);
	});
});
