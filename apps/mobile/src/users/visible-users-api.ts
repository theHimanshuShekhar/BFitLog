import { buildAuthRequestInit } from "@/api/auth-request";
import { apiBaseUrl } from "@/api/client";
import { authClient } from "@/auth/auth-client";

export type VisibleUser = {
	id: string;
	username: string;
	name: string;
	role: "admin" | "member";
};

export async function listVisibleUsers(): Promise<VisibleUser[]> {
	const response = await fetch(
		`${apiBaseUrl}/visible-users`,
		buildAuthRequestInit(authClient.getCookie()),
	);
	if (!response.ok) {
		throw new Error(`List visible users failed with ${response.status}`);
	}
	const body = (await response.json()) as { users: VisibleUser[] };
	return body.users;
}
