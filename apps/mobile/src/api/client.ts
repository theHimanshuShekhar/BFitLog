export const apiBaseUrl =
	process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${apiBaseUrl}${path}`, init);
	if (!response.ok) {
		throw new Error(`GET ${path} failed with ${response.status}`);
	}
	return (await response.json()) as T;
}
