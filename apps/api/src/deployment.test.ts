import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("deployment runtime", () => {
	it("runs migrations and seed from the API startup path", async () => {
		const dockerfile = await readFile("Dockerfile", "utf8");
		const index = await readFile("src/index.ts", "utf8");

		expect(dockerfile).toContain('CMD ["./node_modules/.bin/tsx", "src/index.ts"]');
		expect(index).toContain("runMigrations");
		expect(index).toContain("ensureDefaultAdmin");
		expect(index).toContain("seedTrainingPlan");
		expect(index.indexOf("await runMigrations()")).toBeLessThan(
			index.indexOf("await ensureDefaultAdmin()"),
		);
		expect(index.indexOf("await ensureDefaultAdmin()")).toBeLessThan(
			index.indexOf("await seedTrainingPlan()"),
		);
		expect(index.indexOf("await seedTrainingPlan()")).toBeLessThan(
			index.indexOf("const app = createApp()"),
		);
		expect(dockerfile).toContain("pnpm --filter @bfitlog/mobile export:web");
		expect(dockerfile).toContain("/app/apps/mobile/dist");
	});
});
