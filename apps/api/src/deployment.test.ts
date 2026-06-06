import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("deployment runtime", () => {
	it("runs the training-plan seed during container startup", async () => {
		const dockerfile = await readFile("Dockerfile", "utf8");
		expect(dockerfile).toContain("src/db/migrate.ts");
		expect(dockerfile).toContain("src/db/seed-training-plan.ts");
		expect(dockerfile.indexOf("src/db/migrate.ts")).toBeLessThan(
			dockerfile.indexOf("src/db/seed-training-plan.ts"),
		);
		expect(dockerfile.indexOf("src/db/seed-training-plan.ts")).toBeLessThan(
			dockerfile.indexOf("src/index.ts"),
		);
	});
});
