import { apiBaseUrl } from "@/api/client";
import { authClient } from "@/auth/auth-client";

export type AdminUser = {
	id: string;
	username: string;
	displayName: string;
	role: "admin" | "member";
	createdAt: string;
};

function authHeaders(json = false) {
	const headers = new Headers();
	const cookie = authClient.getCookie();
	if (cookie) headers.set("Cookie", cookie);
	if (json) headers.set("Content-Type", "application/json");
	return {
		headers,
		credentials: cookie ? "omit" : ("include" as RequestCredentials),
	};
}

async function parseJson<T>(response: Response, label: string): Promise<T> {
	if (!response.ok) throw new Error(`${label} failed with ${response.status}`);
	return (await response.json()) as T;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
	const response = await fetch(`${apiBaseUrl}/admin/users`, authHeaders());
	const body = await parseJson<{ users: AdminUser[] }>(response, "List users");
	return body.users;
}

export async function createAdminUser(input: {
	username: string;
	displayName: string;
	password: string;
	role?: "admin" | "member";
}): Promise<{ user: AdminUser; defaultAdminDeleted: boolean }> {
	const response = await fetch(`${apiBaseUrl}/admin/users`, {
		method: "POST",
		...authHeaders(true),
		body: JSON.stringify(input),
	});
	return parseJson<{ user: AdminUser; defaultAdminDeleted: boolean }>(
		response,
		"Create user",
	);
}

export async function resetUserPassword(
	userId: string,
	newPassword: string,
): Promise<void> {
	const response = await fetch(`${apiBaseUrl}/admin/users/${userId}/password`, {
		method: "POST",
		...authHeaders(true),
		body: JSON.stringify({ newPassword }),
	});
	await parseJson<{ ok: boolean }>(response, "Reset password");
}
