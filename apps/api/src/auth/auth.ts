import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, username } from "better-auth/plugins";
import { createDb } from "../db/client.js";
import { readEnv } from "../env.js";
import * as schema from "../db/schema.js";

const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);
const env = readEnv();

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
	secret: env.betterAuthSecret,
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 4,
	},
	session: {
		expiresIn: 60 * 60 * 24 * 90,
	},
	advanced: {
		useSecureCookies: env.useSecureCookies,
	},
	trustedOrigins: env.betterAuthTrustedOrigins,
	user: {
		additionalFields: {
			role: {
				type: "string",
				required: true,
				defaultValue: "member",
				input: true,
			},
		},
	},
	plugins: [
		admin({ defaultRole: "member", adminRoles: ["admin"] }),
		username({
			minUsernameLength: 2,
			usernameValidator: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
		}),
		expo(),
	],
});

export type Auth = typeof auth;
