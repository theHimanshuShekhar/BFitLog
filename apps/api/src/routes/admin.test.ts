import { createApp } from "../app.js";
import { ensureDefaultAdmin } from "../bootstrap.js";
import { seedTrainingPlan } from "../db/seed-training-plan.js";
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

	it("blocks the default admin from app data until the first real user is created", async () => {
		await seedTrainingPlan();
		const { app, cookie } = await createDefaultAdminSession();

		const plan = await app.request("/training-plan/template", {
			headers: { cookie },
		});
		expect(plan.status).toBe(403);

		const users = await app.request("/admin/users", { headers: { cookie } });
		expect(users.status).toBe(200);

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
		const realLogin = await app.request("/api/auth/sign-in/username", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ username: "realadmin", password: "password1234" }),
		});
		const realCookie = realLogin.headers.get("set-cookie") ?? "";

		const allowedPlan = await app.request("/training-plan/template", {
			headers: { cookie: realCookie },
		});
		expect(allowedPlan.status).toBe(200);
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

	it("does not let an admin demote the last admin", async () => {
		const { app, cookie } = await createRealAdminSession();
		const users = await app.request("/admin/users", { headers: { cookie } });
		const usersBody = await users.json();
		const adminUser = usersBody.users.find(
			(item: { username: string }) => item.username === "realadmin",
		);

		const demote = await app.request(`/admin/users/${adminUser.id}/role`, {
			method: "PATCH",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({ role: "member" }),
		});

		expect(demote.status).toBe(400);
		expect(await demote.json()).toMatchObject({
			error: "Cannot demote the last admin",
		});
	});


	it("lets admins create and list Partner Links", async () => {
		const { app, cookie } = await createRealAdminSession();
		const memberA = await app.request("/admin/users", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({
				username: "membera",
				displayName: "Member A",
				password: "password1234",
			}),
		});
		const memberB = await app.request("/admin/users", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({
				username: "memberb",
				displayName: "Member B",
				password: "password1234",
			}),
		});
		const memberABody = await memberA.json();
		const memberBBody = await memberB.json();

		const createLink = await app.request("/admin/partner-links", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({
				userAId: memberABody.user.id,
				userBId: memberBBody.user.id,
			}),
		});
		expect(createLink.status).toBe(201);

		const links = await app.request("/admin/partner-links", {
			headers: { cookie },
		});
		expect(links.status).toBe(200);
		const linksBody = await links.json();
		expect(linksBody.partnerLinks).toHaveLength(1);
		expect(
			[
				linksBody.partnerLinks[0].userA.username,
				linksBody.partnerLinks[0].userB.username,
			].sort(),
		).toEqual(["membera", "memberb"]);
	});

	it("lets admins edit the seeded training plan", async () => {
		await seedTrainingPlan();
		const { app, cookie } = await createRealAdminSession();

		const updateTemplate = await app.request(
			"/admin/training-plan/templates/beginner-upper-lower-4-day",
			{
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ name: "Updated Beginner Split" }),
			},
		);
		expect(updateTemplate.status).toBe(200);

		const updateDay = await app.request(
			"/admin/training-plan/days/day-1-upper-a",
			{
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ title: "Updated Upper A" }),
			},
		);
		expect(updateDay.status).toBe(200);


		const updateExercise = await app.request(
			"/admin/training-plan/planned-exercises/day-1-upper-a-smith-machine-bench-press",
			{
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ targetSets: 4, restSeconds: 120 }),
			},
		);
		expect(updateExercise.status).toBe(200);

		const plan = await app.request("/training-plan/template", {
			headers: { cookie },
		});
		const planBody = await plan.json();
		expect(planBody.template.name).toBe("Updated Beginner Split");
		expect(planBody.template.days[0].title).toBe("Updated Upper A");
		expect(planBody.template.days[0].exercises[0]).toMatchObject({
			targetSets: 4,
			restSeconds: 120,
		});
	});

	it("rejects invalid planned exercise target edits", async () => {
		await seedTrainingPlan();
		const { app, cookie } = await createRealAdminSession();

		const response = await app.request(
			"/admin/training-plan/planned-exercises/day-1-upper-a-smith-machine-bench-press",
			{
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ targetMinReps: 12, targetMaxReps: 8 }),
			},
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: "Invalid planned exercise target",
		});
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

		const reset = await app.request(
			`/admin/users/${createdBody.user.id}/password`,
			{
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ newPassword: "newpassword123" }),
			},
		);
		expect(reset.status).toBe(200);

		const login = await app.request("/api/auth/sign-in/username", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ username: "member", password: "newpassword123" }),
		});
		expect(login.status).toBe(200);
	});
});
