import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import pg from "pg";

const databaseUrl =
	process.env.DATABASE_URL ?? "postgres://bfitlog:bfitlog@localhost:5432/bfitlog";
const apiBaseUrl = process.env.E2E_API_URL ?? "http://localhost:3100";
const apiDir = resolve(process.cwd(), "apps/api");
const testUser = {
	username: "test",
	displayName: "Test User",
	password: "test",
};

type Credentials = {
	username: string;
	displayName: string;
	password: string;
};

test.beforeEach(async ({ page }) => {
	await ensurePersistentTestUser();
	await cleanupTestUserArtifacts();
	await page.goto("/login");
});

test("login flow rejects bad credentials and accepts the persistent test user", async ({
	page,
}) => {
	await login(page, testUser.username, "wrong-password");
	await expect(page).toHaveURL(/\/login$/);

	await login(page, testUser.username, testUser.password);
	await expect(page.getByText("Signed in")).toBeVisible();
	await expect(page.getByText(testUser.displayName)).toBeVisible();
});

test("persistent test user can log out and log back in", async ({ page }) => {
	await loginAsTestUser(page);
	await openTab(page, "Settings");
	await page.getByRole("button", { name: "Log out" }).click();
	await expect(page).toHaveURL(/\/login$/);
	await login(page, testUser.username, testUser.password);
	await expect(page.getByText("Signed in")).toBeVisible();
});

test("setup route validates first-run form fields without mutating data", async ({
	page,
}) => {
	await page.goto("/setup");
	await page.getByRole("button", { name: "Create users" }).click();

	await expect(page.getByText("Admin username is required.")).toBeVisible();
	await expect(page.getByText("Admin display name is required.")).toBeVisible();
	await expect(
		page.getByText("Admin password must be at least 8 characters."),
	).toBeVisible();
	await expect(page.getByText("Partner username is required.")).toBeVisible();
	await expect(page.getByText("Partner display name is required.")).toBeVisible();
	await expect(
		page.getByText("Partner password must be at least 8 characters."),
	).toBeVisible();
});

test("admin user management creates a member, links partners, changes role, and resets password", async ({
	page,
}) => {
	const member = credentials("e2e_member");
	const resetPassword = `${member.password}-reset`;

	await loginAsTestUser(page);
	await openTab(page, "Settings");
	await page
		.getByRole("textbox", { name: "Username", exact: true })
		.fill(member.username);
	await page.getByLabel("Display name").fill(member.displayName);
	await page.getByLabel("Temporary password").fill(member.password);
	await page.getByRole("button", { name: "Create user" }).click();
	await expect(page.getByText(`${member.username} · member`)).toBeVisible();

	await page.getByLabel("First username").fill(testUser.username);
	await page.getByLabel("Second username").fill(member.username);
	await page.getByRole("button", { name: "Create Partner Link" }).click();
	await expect(
		page.getByText(
			new RegExp(
				`${testUser.username} ↔ ${member.username}|${member.username} ↔ ${testUser.username}`,
			),
		),
	).toBeVisible();

	page.once("dialog", (dialog) => dialog.accept());
	await page.getByRole("button", { name: "Make admin" }).click();
	await expect(page.getByText(`${member.username} · admin`)).toBeVisible();

	await page.getByLabel("New password").last().fill(resetPassword);
	await page.getByRole("button", { name: "Reset password" }).last().click();
	await expect(page.getByText(`Password reset for ${member.username}.`)).toBeVisible();

	await page.getByRole("button", { name: "Log out" }).click();
	await login(page, member.username, resetPassword);
	await expect(page.getByText("Signed in")).toBeVisible();
});

test("plan flow opens tabs, exercise details, and media links", async ({ page }) => {
	await loginAsTestUser(page);

	await openTab(page, "Plan");
	await expect(page.getByText("4-Day Beginner Upper/Lower Split")).toBeVisible();
	await expect(page.getByText("Day 1: Upper Body A")).toBeVisible();
	await expect(
		page
			.getByText("Arm circles (forward/backward): 30 seconds each direction.")
			.first(),
	).toBeVisible();
	await page.getByRole("link", { name: /Smith Machine Bench Press/ }).first().click();
	await expect(page).toHaveURL(/\/exercise\?/);
	await expect(page.getByRole("heading", { name: "Exercise" })).toBeVisible();
	await expect(page.getByRole("link", { name: /Open GIF/ })).toBeVisible();

	await page.goBack();
	await expect(page.getByText("Day 1: Upper Body A")).toBeVisible();
	const popupPromise = page.waitForEvent("popup");
	await page.getByRole("link", { name: "Open VIDEO" }).first().click();
	const popup = await popupPromise;
	await expect(popup).toHaveURL(/youtube\.com|youtu\.be/);
	await popup.close();

	await openTab(page, "History");
	await expect(page.getByText("History").first()).toBeVisible();
	await openTab(page, "Stats");
	await expect(page.getByText("Stats").first()).toBeVisible();
	await page.getByRole("tab", { name: "90d" }).click();
	await page.getByRole("tab", { name: "all" }).click();
});

test("body-weight flow adds, charts, edits, and deletes a log", async ({ page }) => {
	const firstNote = `Morning weigh-in ${randomUUID().slice(0, 8)}`;
	const updatedNote = `After workout ${randomUUID().slice(0, 8)}`;

	await loginAsTestUser(page);
	await page.getByLabel("Body weight in kilograms").fill("101.4");
	await page.getByLabel("Body weight note").fill(firstNote);
	await page.getByRole("button", { name: "Save body weight" }).click();
	await expect(page.getByText("101.4 kg")).toBeVisible();

	await openTab(page, "Stats");
	await expect(page.getByText("101.4 kg")).toBeVisible();
	await page.getByRole("tab", { name: "90d" }).click();
	await page.getByRole("tab", { name: "1y" }).click();

	await openTab(page, "History");
	await expect(page.getByText(firstNote)).toBeVisible();
	await page.mouse.wheel(0, 500);
	await page.getByRole("button", { name: "Edit" }).click();
	await page.getByLabel("Body weight in kilograms").last().fill("100.2");
	await page.getByLabel("Body weight note").last().fill(updatedNote);
	await page.getByRole("button", { name: "Save" }).click();
	await expect(page.getByText("100.2 kg")).toBeVisible();
	await expect(page.getByText(updatedNote)).toBeVisible();

	page.once("dialog", (dialog) => dialog.accept());
	await page.mouse.wheel(0, 500);
	await page.getByRole("button", { name: "Delete" }).click();
	await expect(page.getByText(updatedNote)).toHaveCount(0);
});

test("settings flow saves goals, reminders, and changes password then restores it", async ({
	page,
}) => {
	const temporaryPassword = "testtest";

	await loginAsTestUser(page);
	await openTab(page, "Settings");
	await page.getByLabel("Target weight in kilograms").fill("88.5");
	await page.getByRole("radio", { name: "maintain" }).click();
	await page.getByRole("button", { name: "Save goal", exact: true }).click();
	await expect(page.getByText("Synced").first()).toBeVisible();

	await page.getByLabel("Workout frequency goal per week").fill("4");
	await page.getByRole("switch", { name: "Enable workout reminder" }).click();
	await page.getByLabel("Workout reminder time").fill("19:30");
	await page.getByRole("switch", { name: "Enable weigh-in reminder" }).click();
	await page.getByLabel("Weigh-in reminder time").fill("06:45");
	await page.getByRole("button", { name: "Save goals and reminders" }).click();
	await expect(page.getByText("Synced").first()).toBeVisible();

	await page.getByLabel("Current password").fill(testUser.password);
	await page.getByLabel("New password").first().fill(temporaryPassword);
	await page.getByRole("button", { name: "Change password" }).click();
	await expect(
		page.getByText("Password changed. Other sessions were revoked."),
	).toBeVisible();

	await page.getByRole("button", { name: "Log out" }).click();
	await login(page, testUser.username, temporaryPassword);
	await expect(page.getByText("Signed in")).toBeVisible();
	await ensurePersistentTestUser();
});

test("workout flow starts a selected day, logs exercise work, completes, views history, and deletes", async ({
	page,
}) => {
	const note = `Lower body felt good ${randomUUID().slice(0, 8)}`;

	await loginAsTestUser(page);
	await page.getByRole("tab", { name: "Select training day 2" }).click();
	await page.getByRole("button", { name: "Start next workout" }).click();
	await expect(page).toHaveURL(/\/workout$/);
	await expect(page.getByText("Workout draft")).toBeVisible();
	await page.getByText("5 minutes light cardio").click();
	await expect(page.getByText(/☑ 5 minutes light cardio/)).toBeVisible();

	await page.getByLabel("Workout note").fill(note);
	await page.getByRole("button", { name: /Smith Machine Front Squat/ }).click();
	await page.getByLabel("Set 1 weight in kilograms").first().fill("60");
	await page.getByLabel("Set 1 reps").first().fill("8");
	await page.getByRole("button", { name: "Add set" }).first().click();
	await page.getByLabel("Set 2 weight in kilograms").first().fill("62.5");
	await page.getByLabel("Set 2 reps").first().fill("8");
	await page.getByRole("checkbox", { name: "Mark good form" }).first().click();
	await page.getByLabel("Exercise note").first().fill("Depth looked solid");
	await page.getByRole("button", { name: "Save set" }).first().click();
	await expect(page.getByText("Rest timer", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Pause rest timer" }).click();
	await page.getByRole("button", { name: "Resume rest timer" }).click();
	await page.getByRole("button", { name: "Skip rest timer" }).click();

	await page.getByRole("button", { name: "Save workout note" }).click();
	await page.getByRole("button", { name: "Complete workout" }).click();
	await expect(page).toHaveURL(/\/history$/);
	await expect(page.getByText("Day 2: Lower Body A")).toBeVisible();
	await expect(page.getByText(note)).toBeVisible();

	await page.getByRole("link", { name: "View details" }).click();
	await expect(page.getByText("Workout detail")).toBeVisible();
	page.once("dialog", (dialog) => dialog.accept());
	await page.getByRole("button", { name: "Delete workout" }).click();
	await expect(page).toHaveURL(/\/history$/);
	await expect(page.getByText("No completed workouts yet")).toBeVisible();
});

test("draft workout flow skips an exercise and discards the draft", async ({
	page,
}) => {
	await loginAsTestUser(page);

	await page.getByRole("button", { name: "Start next workout" }).click();
	await expect(page).toHaveURL(/\/workout$/);
	await page.getByLabel("Skip reason").first().fill("Cable station unavailable");
	await page.getByRole("button", { name: "Skip" }).first().click();
	await expect(page.getByText("Status: skipped")).toBeVisible();

	page.once("dialog", (dialog) => dialog.accept());
	await page.getByRole("button", { name: "Discard draft" }).click();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole("button", { name: "Start next workout" })).toBeVisible();
});

async function ensurePersistentTestUser() {
	const apiEnv = {
		...process.env,
		BETTER_AUTH_URL: apiBaseUrl,
		BETTER_AUTH_SECURE_COOKIES: "false",
		BETTER_AUTH_TRUSTED_ORIGINS:
			"http://localhost:8082,http://localhost:19006,bfitlog://",
	};
	execFileSync(
		"pnpm",
		[
			"exec",
			"tsx",
			"-e",
			`import { eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { auth } from './src/auth/auth.ts';
import { internalEmailForUsername } from './src/bootstrap.ts';
import { createDb } from './src/db/client.ts';
import { account, session, user } from './src/db/schema.ts';
async function main() {
  const db = createDb(process.env.DATABASE_URL ?? '${databaseUrl}');
  const username = '${testUser.username}';
  const password = '${testUser.password}';
  const email = internalEmailForUsername(username);
  let existing = await db.select({ id: user.id }).from(user).where(eq(user.username, username)).limit(1);
  if (existing.length === 0) {
    const created = await auth.api.signUpEmail({ body: { name: '${testUser.displayName}', email, username, password: 'testtest' } });
    existing = [{ id: created.user.id }];
  }
  const userId = existing[0].id;
  await db.update(user).set({ name: '${testUser.displayName}', role: 'admin', updatedAt: new Date() }).where(eq(user.id, userId));
  await db.update(account).set({ password: await hashPassword(password), updatedAt: new Date() }).where(eq(account.userId, userId));
  await db.delete(session).where(eq(session.userId, userId));
}
main().catch((error) => { console.error(error); process.exit(1); });`,
		],
		{ cwd: apiDir, env: apiEnv, stdio: "inherit" },
	);
	execFileSync("pnpm", ["db:seed:training-plan"], {
		cwd: apiDir,
		env: apiEnv,
		stdio: "inherit",
	});
}

async function cleanupTestUserArtifacts() {
	const client = new pg.Client({ connectionString: databaseUrl });
	await client.connect();
	try {
		await client.query("BEGIN");
		const userResult = await client.query<{ id: string }>(
			'SELECT id FROM "user" WHERE username = $1',
			[testUser.username],
		);
		const testUserId = userResult.rows[0]?.id;
		if (testUserId) {
			await client.query(
				'DELETE FROM workout_logs WHERE user_id = $1 AND status IN (\'draft\', \'discarded\')',
				[testUserId],
			);
			await client.query(
				'DELETE FROM workout_logs WHERE user_id = $1 AND note LIKE \'%Lower body felt good%\'',
				[testUserId],
			);
			await client.query(
				'DELETE FROM body_weight_logs WHERE user_id = $1 AND (note LIKE \'Morning weigh-in%\' OR note LIKE \'After workout%\')',
				[testUserId],
			);
			await client.query("DELETE FROM body_weight_goals WHERE user_id = $1", [
				testUserId,
			]);
			await client.query("DELETE FROM workout_frequency_goals WHERE user_id = $1", [
				testUserId,
			]);
			await client.query("DELETE FROM reminder_settings WHERE user_id = $1", [
				testUserId,
			]);
		}
		await client.query(
			'DELETE FROM "user" WHERE username LIKE $1 AND username <> $2',
			["e2e_member%", testUser.username],
		);
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		await client.end();
	}
}

function credentials(prefix: string): Credentials {
	const suffix = randomUUID().slice(0, 8);
	return {
		username: `${prefix}${suffix}`,
		displayName: `${prefix} ${suffix}`,
		password: `Password-${suffix}`,
	};
}

async function loginAsTestUser(page: Page) {
	await login(page, testUser.username, testUser.password);
	await expect(page.getByText("Signed in")).toBeVisible();
}

async function login(page: Page, username: string, password: string) {
	await page.goto("/login");
	await page.getByRole("textbox", { name: "Username", exact: true }).fill(username);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Log in" }).click();
}

async function openTab(page: Page, name: string) {
	const tab = page.getByRole("tab", { name });
	if (await tab.count()) {
		await tab.click();
		return;
	}
	await page.getByText(name, { exact: true }).last().click();
}
