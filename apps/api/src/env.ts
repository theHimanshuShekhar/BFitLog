export type ApiEnv = {
	port: number;
	corsAllowedOrigins: string[];
	betterAuthTrustedOrigins: string[];
	useSecureCookies: boolean;
};

const developmentOrigins = [
	"http://localhost:3000",
	"http://localhost:8081",
	"http://localhost:19006",
	"bfitlog://",
	"bfitlog://*",
];

export function readEnv(env = process.env): ApiEnv {
	const betterAuthUrl = env.BETTER_AUTH_URL ?? "http://localhost:3000";
	const corsAllowedOrigins = parseCsv(env.CORS_ALLOWED_ORIGINS);
	const betterAuthTrustedOrigins = unique([
		betterAuthUrl,
		...developmentOrigins,
		...parseCsv(env.BETTER_AUTH_TRUSTED_ORIGINS),
		...(env.NODE_ENV === "development"
			? ["exp://", "exp://**", "exp://192.168.*.*:*/**"]
			: []),
	]);

	return {
		port: Number(env.PORT ?? 3000),
		corsAllowedOrigins:
			corsAllowedOrigins.length > 0
				? corsAllowedOrigins
				: env.NODE_ENV === "production"
					? [betterAuthUrl]
					: [],
		betterAuthTrustedOrigins,
		useSecureCookies:
			env.BETTER_AUTH_SECURE_COOKIES === "true" ||
			env.NODE_ENV === "production",
	};
}

export function parseCsv(value: string | undefined) {
	return (value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function unique(values: string[]) {
	return [...new Set(values)];
}
