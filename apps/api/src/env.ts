export type ApiEnv = {
	port: number;
};

export function readEnv(env = process.env): ApiEnv {
	return {
		port: Number(env.PORT ?? 3000),
	};
}
