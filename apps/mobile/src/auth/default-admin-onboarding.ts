export const defaultAdminUsername = "admin";

export type SessionUser = {
	username?: string | null | undefined;
};

export function isDefaultAdminUser(user: SessionUser | null | undefined) {
	return user?.username === defaultAdminUsername;
}

export function routeAfterLogin(user: SessionUser | null | undefined) {
	return isDefaultAdminUser(user) ? "/first-user" : "/";
}
