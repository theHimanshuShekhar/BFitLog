export function buildAuthRequestInit(
	cookie: string,
	init: RequestInit = {},
): RequestInit {
	const headers = new Headers(init.headers);
	if (cookie) headers.set("Cookie", cookie);

	return {
		...init,
		headers,
		credentials: cookie ? "omit" : "include",
	};
}
