import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "member"]);

export const usernameSchema = z
	.string()
	.trim()
	.min(2)
	.max(40)
	.regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, underscores, or hyphens");

export const passwordSchema = z.string().min(10).max(200);

export const setupRequestSchema = z.object({
	admin: z.object({
		username: usernameSchema,
		password: passwordSchema,
		displayName: z.string().trim().min(1).max(80),
	}),
	partner: z.object({
		username: usernameSchema,
		password: passwordSchema,
		displayName: z.string().trim().min(1).max(80),
	}),
});

export const loginRequestSchema = z.object({
	username: usernameSchema,
	password: z.string().min(1).max(200),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type SetupRequest = z.infer<typeof setupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
