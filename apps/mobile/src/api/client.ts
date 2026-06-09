import { Platform } from "react-native";

const configuredApiOrigin = process.env.EXPO_PUBLIC_API_URL;

function runtimeWebOrigin() {
	if (typeof location !== "undefined") return location.origin;
	return "http://localhost:3000";
}

const apiOrigin =
	configuredApiOrigin ??
	(Platform.OS === "web" ? "" : "http://localhost:3000");

export const apiBaseUrl = `${apiOrigin.replace(/\/$/, "")}/api/v1`;
export const authBaseUrl = `${
	configuredApiOrigin?.replace(/\/$/, "") ??
	(Platform.OS === "web" ? runtimeWebOrigin() : "http://localhost:3000")
}/api/v1/auth`;

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${apiBaseUrl}${path}`, init);
	if (!response.ok) {
		throw new Error(`GET ${path} failed with ${response.status}`);
	}
	return (await response.json()) as T;
}
