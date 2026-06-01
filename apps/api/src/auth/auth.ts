import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { createDb } from "../db/client.js";
import * as schema from "../db/schema.js";

const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
	secret:
		process.env.BETTER_AUTH_SECRET ??
		"development-secret-change-before-production",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
	},
	session: {
		expiresIn: 60 * 60 * 24 * 90,
	},
	trustedOrigins: [
		"bfitlog://",
		"bfitlog://*",
		"http://localhost:8081",
		"http://localhost:19006",
		...(process.env.NODE_ENV === "development"
			? ["exp://", "exp://**", "exp://192.168.*.*:*/**"]
			: []),
	],
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
		username({
			minUsernameLength: 2,
			usernameValidator: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
		}),
		expo(),
	],
});

export type Auth = typeof auth;
