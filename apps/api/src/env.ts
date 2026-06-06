export type ApiEnv = {
	port: number;
	corsAllowedOrigins: string[];
	betterAuthSecret: string;
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

const developmentSecret = "development-secret-change-before-production";

export function readEnv(env = process.env): ApiEnv {
	const isProduction = env.NODE_ENV === "production";
	const betterAuthUrl = env.BETTER_AUTH_URL ?? "http://localhost:3000";
	const betterAuthSecret = env.BETTER_AUTH_SECRET ?? developmentSecret;
	if (isProduction && betterAuthSecret === developmentSecret) {
		throw new Error("BETTER_AUTH_SECRET must be set in production");
	}
	const corsAllowedOrigins = parseCsv(env.CORS_ALLOWED_ORIGINS);
	const betterAuthTrustedOrigins = unique([
		betterAuthUrl,
		...(isProduction ? [] : developmentOrigins),
		...parseCsv(env.BETTER_AUTH_TRUSTED_ORIGINS),
		...(env.NODE_ENV === "development"
			? ["exp://", "exp://**", "exp://192.168.*.*:*/**"]
			: []),
	]);
	const secureCookies = env.BETTER_AUTH_SECURE_COOKIES;

	return {
		port: Number(env.PORT ?? 3000),
		corsAllowedOrigins:
			corsAllowedOrigins.length > 0
				? corsAllowedOrigins
				: isProduction
					? [betterAuthUrl]
					: [],
		betterAuthSecret,
		betterAuthTrustedOrigins,
		useSecureCookies:
			secureCookies === undefined ? isProduction : secureCookies === "true",
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
