import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	timeout: 60_000,
	expect: { timeout: 10_000 },
	fullyParallel: false,
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: "http://localhost:8082",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: [
		{
			command:
				"docker compose up -d postgres && node -e \"require('node:http').createServer((_, res) => res.end('postgres ready')).listen(3099)\"",
			url: "http://localhost:3099",
			timeout: 120_000,
			reuseExistingServer: true,
		},
		{
			command:
				"PORT=3100 BETTER_AUTH_URL=http://localhost:3100 BETTER_AUTH_SECURE_COOKIES=false BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:8082,http://localhost:19006,bfitlog:// CORS_ALLOWED_ORIGINS=http://localhost:8082 pnpm --filter @bfitlog/api start",
			url: "http://localhost:3100/health",
			timeout: 120_000,
			reuseExistingServer: true,
		},
		{
			command:
				"EXPO_PUBLIC_API_URL=http://localhost:3100 pnpm --filter @bfitlog/mobile exec expo start --web --host localhost --port 8082",
			url: "http://localhost:8082",
			timeout: 120_000,
			reuseExistingServer: true,
		},
	],
});
